import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    // Dynamic import to avoid webpack issues
    const PDFDocument = (await import("pdfkit")).default;
    
    const { invoiceId } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        procedure: {
          include: {
            treatmentPlan: {
              include: {
                patient: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return new Response("Invoice not found", { status: 404 });
    }

    const patient = invoice.procedure.treatmentPlan?.patient;
    if (!patient) {
      return new Response("Patient not found", { status: 404 });
    }

    // Create PDF using Buffer
    // Disable font loading to avoid .afm file issues
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ 
      margin: 50,
      autoFirstPage: true,
    });
    
    // Use built-in fonts only (no external .afm files needed)
    // This avoids the ENOENT error for Helvetica.afm

    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Build PDF content with improved design
    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;

    // Header - clean and minimal
    doc
      .fontSize(32)
      .fillColor("#046D8B")
      .font("Helvetica-Bold")
      .text("INVOICE", { align: "center" })
      .moveDown(1);

    // Clinic info - simple and clean
    doc
      .fontSize(14)
      .fillColor("#1A1A1A")
      .font("Helvetica-Bold")
      .text("Dental Care Clinic", { align: "center" })
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#4A5568")
      .text("123 Health Street", { align: "center" })
      .text("Medical City, MC 12345", { align: "center" })
      .text("Phone: +1 (555) 123-4567", { align: "center" })
      .text("Email: info@dentalcare.com", { align: "center" })
      .moveDown(2);

    // Invoice details - simple right-aligned
    doc
      .fontSize(10)
      .fillColor("#333333")
      .font("Helvetica-Bold")
      .text(`Invoice #: ${invoice.id.slice(0, 8).toUpperCase()}`, {
        align: "right",
      })
      .font("Helvetica")
      .text(
        `Date: ${invoice.createdAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        { align: "right" }
      );
    
    // Status
    const statusColor = invoice.status === "paid" ? "#00AA00" : "#FF6B6B";
    doc
      .fontSize(10)
      .fillColor(statusColor)
      .font("Helvetica-Bold")
      .text(`Status: ${invoice.status.toUpperCase()}`, { align: "right" })
      .moveDown(1.5);

    // Bill To section - clean spacing
    doc
      .fontSize(12)
      .fillColor("#046D8B")
      .font("Helvetica-Bold")
      .text("Bill To:", { continued: false })
      .moveDown(0.5)
      .fontSize(11)
      .fillColor("#333333")
      .font("Helvetica")
      .text(patient.name)
      .text(patient.email)
      .text(patient.phone || "N/A")
      .moveDown(2);

    // Service details section - clean formatting
    doc
      .fontSize(13)
      .fillColor("#046D8B")
      .font("Helvetica-Bold")
      .text("Service Details")
      .moveDown(0.8)
      .fontSize(11)
      .fillColor("#333333")
      .font("Helvetica")
      .font("Helvetica-Bold")
      .text("Procedure:", { continued: true })
      .font("Helvetica")
      .text(` ${invoice.procedure.title}`);
    
    if (invoice.procedure.description) {
      doc
        .font("Helvetica-Bold")
        .text("Description:", { continued: true })
        .font("Helvetica")
        .text(` ${invoice.procedure.description}`);
    }
    
    if (invoice.procedure.completedDate) {
      doc
        .font("Helvetica-Bold")
        .text("Completed:", { continued: true })
        .font("Helvetica")
        .text(
          ` ${invoice.procedure.completedDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}`
        );
    }
    
    doc.moveDown(2);

    // Total Amount section - FIXED: separate lines to avoid overlap
    const totalY = doc.y;
    doc
      .fontSize(12)
      .fillColor("#333333")
      .font("Helvetica-Bold")
      .text("Total Amount:", { align: "right" })
      .moveDown(0.3);
    
    doc
      .fontSize(18)
      .fillColor("#046D8B")
      .font("Helvetica-Bold")
      .text(`$${invoice.amount.toFixed(2)}`, { align: "right" })
      .moveDown(1);

    // Payment status with better styling
    if (invoice.status === "paid" && invoice.paidAt) {
      doc
        .fontSize(10)
        .fillColor("#00AA00")
        .font("Helvetica-Bold")
        .text(
          `✓ Paid on: ${invoice.paidAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}`,
          { align: "right" }
        );
    } else {
      doc
        .fontSize(10)
        .fillColor("#FF6B6B")
        .font("Helvetica-Bold")
        .text("⚠ Payment Pending", { align: "right" });
    }

    doc.moveDown(3);

    // Footer with better styling
    doc
      .fontSize(9)
      .fillColor("#999999")
      .font("Helvetica")
      .text("Thank you for choosing our dental care services!", {
        align: "center",
      })
      .text("Please contact us if you have any questions.", {
        align: "center",
      });

    // Finalize PDF and wait for all chunks
    doc.end();

    // Wait for PDF to be generated
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      doc.on("error", reject);
    });

    // Convert Buffer to Uint8Array for Response
    const pdfArray = new Uint8Array(pdfBuffer);

    return new Response(pdfArray, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoiceId.slice(
          0,
          8
        )}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Generate PDF error:", error);
    console.error("Error details:", error?.message, error?.stack);
    return new Response(
      JSON.stringify({ error: "Failed to generate PDF", details: error?.message }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
