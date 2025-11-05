import { Socket } from "socket.io-client";
import { connectSocket } from "./api";

interface QueuedEvent {
  event: string;
  data: any;
  ack?: (response: any) => void;
  retries: number;
  timestamp: number;
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 500; // 500ms
const MAX_RETRY_DELAY = 10000; // 10 seconds
const QUEUE_TIMEOUT = 30000; // 30 seconds - max time to wait for reconnection

class SocketEventQueue {
  private queue: QueuedEvent[] = [];
  private isProcessing = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private socket: Socket | null = null;

  constructor() {
    // Clean up old events periodically (older than QUEUE_TIMEOUT)
    setInterval(() => {
      const now = Date.now();
      this.queue = this.queue.filter(
        (event) => now - event.timestamp < QUEUE_TIMEOUT
      );
    }, 5000);
  }

  setSocket(socket: Socket) {
    this.socket = socket;
    // Process queue when socket connects
    socket.on("connect", () => {
      console.log("[SocketQueue] Socket connected, processing queue");
      this.processQueue();
    });
  }

  private calculateRetryDelay(retries: number): number {
    // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms, max 10000ms
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, retries),
      MAX_RETRY_DELAY
    );
    return delay;
  }

  private async processQueue() {
    if (this.isProcessing || !this.socket) return;
    
    if (!this.socket.connected) {
      // Try to reconnect
      if (!this.reconnectTimeout) {
        this.attemptReconnect();
      }
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.socket.connected) {
      const event = this.queue.shift();
      if (!event) break;

      try {
        await this.sendEvent(event);
      } catch (error) {
        console.error("[SocketQueue] Error sending queued event:", error);
        // Re-queue with retry if retries left
        if (event.retries < MAX_RETRIES) {
          event.retries++;
          const delay = this.calculateRetryDelay(event.retries);
          console.log(
            `[SocketQueue] Retrying event ${event.event} in ${delay}ms (attempt ${event.retries}/${MAX_RETRIES})`
          );
          setTimeout(() => {
            this.queue.unshift(event); // Add back to front
          }, delay);
        } else {
          console.error(
            `[SocketQueue] Max retries reached for event ${event.event}, dropping`
          );
          // Call ack with error if provided
          if (event.ack) {
            event.ack({ ok: false, error: "max_retries_exceeded" });
          }
        }
      }
    }

    this.isProcessing = false;
  }

  private async sendEvent(event: QueuedEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Event timeout"));
      }, 5000); // 5 second timeout for each event

      this.socket.emit(event.event, event.data, (ack: any) => {
        clearTimeout(timeout);
        if (ack?.ok === false) {
          reject(new Error(ack.error || "Event failed"));
        } else {
          if (event.ack) {
            event.ack(ack);
          }
          resolve();
        }
      });
    });
  }

  private attemptReconnect() {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.socket && !this.socket.connected && this.queue.length > 0) {
        console.log("[SocketQueue] Attempting to reconnect...");
        // Socket.IO will auto-reconnect, we just need to wait
        // The connect event handler will process the queue
      }
    }, 1000);
  }

  async enqueue(
    event: string,
    data: any,
    ack?: (response: any) => void
  ): Promise<void> {
    const queuedEvent: QueuedEvent = {
      event,
      data,
      ack,
      retries: 0,
      timestamp: Date.now(),
    };

    this.queue.push(queuedEvent);
    console.log(`[SocketQueue] Enqueued event ${event}, queue size: ${this.queue.length}`);

    // Try to process immediately if socket is connected
    if (this.socket && this.socket.connected) {
      this.processQueue();
    } else {
      // Trigger reconnection attempt
      this.attemptReconnect();
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clearQueue() {
    this.queue = [];
  }
}

// Singleton instance
const socketQueue = new SocketEventQueue();

/**
 * Universal utility to send socket events with automatic retry and queue management
 * @param event - Socket event name
 * @param data - Event data
 * @param params - Socket connection params (patientId)
 * @param ack - Optional acknowledgment callback
 * @returns Promise that resolves when event is sent (or queued)
 */
export async function sendSocketEvent(
  event: string,
  data: any,
  params?: { patientId?: string },
  ack?: (response: any) => void
): Promise<void> {
  // Get or create socket connection
  const socket = connectSocket(params);
  
  // Initialize socket in queue (will be set only once)
  socketQueue.setSocket(socket as any);

  // Check if socket is connected
  if (socket.connected) {
    // Try to send immediately
    try {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Event timeout"));
        }, 5000);

        socket.emit(event, data, (ackResponse: any) => {
          clearTimeout(timeout);
          if (ackResponse?.ok === false) {
            // If error, queue for retry
            socketQueue.enqueue(event, data, (retryAck) => {
              if (ack) ack(retryAck);
              if (retryAck?.ok !== false) {
                resolve();
              } else {
                reject(new Error(retryAck.error || "Event failed"));
              }
            });
            reject(new Error(ackResponse.error || "Event failed"));
          } else {
            if (ack) ack(ackResponse);
            resolve();
          }
        });
      });
    } catch (error) {
      // If immediate send fails, queue it
      console.log(`[sendSocketEvent] Immediate send failed, queuing: ${event}`);
      return socketQueue.enqueue(event, data, ack);
    }
  } else {
    // Not connected, queue it
    console.log(`[sendSocketEvent] Socket not connected, queuing: ${event}`);
    return socketQueue.enqueue(event, data, ack);
  }
}

