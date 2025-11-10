"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { API_BASE, connectSocket } from "@/lib/api";
import { sendSocketEvent } from "@/lib/socket-utils";
import {
  usePatient,
  useTreatmentPlans,
  useInvalidateAdminQueries,
} from "@/lib/admin-queries";
import { Loader } from "@/app/components/Loader";
import { PatientDiscountBadge } from "@/app/components/PatientDiscountBadge";

type Appointment = {
  id: string;
  title: string;
  datetime: string;
  location?: string | null;
  type: string;
};
type Plan = { id: string; title: string; status: string; steps: any };
type Message = {
  id: string;
  sender: "doctor" | "patient";
  content: string;
  createdAt: string;
};
type Patient = { id: string; name: string; email: string };

import * as React from "react";

function TreatmentPlansSection({
  patientId,
  appointments,
}: {
  patientId: string;
  appointments: Appointment[];
}) {
  const { data: plansData } = useTreatmentPlans(patientId);
  const plans = plansData?.plans ?? [];
  const invalidate = useInvalidateAdminQueries();
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showProcedureForm, setShowProcedureForm] = useState<string | null>(
    null
  );
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

  const togglePlan = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  return (
    <section className="bg-white/80 backdrop-blur rounded-xl border shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Treatment Plans</h2>
        <button
          onClick={() => setShowPlanForm(!showPlanForm)}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          {showPlanForm ? "Cancel" : "+ New Plan"}
        </button>
      </div>

      {showPlanForm && (
        <CreateTreatmentPlanForm
          patientId={patientId}
          onSuccess={() => {
            setShowPlanForm(false);
            invalidate.invalidateTreatmentPlans(patientId);
          }}
        />
      )}

      {plans.length === 0 ? (
        <p className="text-slate-500">No treatment plans</p>
      ) : (
        <div className="space-y-3 mt-3">
          {plans.map((plan: Plan) => (
            <div key={plan.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">
                    {plan.title}
                  </div>
                  <div className="text-sm text-slate-600">
                    Status: {plan.status}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => togglePlan(plan.id)}
                    className="px-2 py-1 text-xs border rounded hover:bg-slate-100"
                  >
                    {expandedPlans.has(plan.id) ? "Collapse" : "Expand"}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setShowProcedureForm(plan.id);
                    }}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Procedure
                  </button>
                </div>
              </div>
              {expandedPlans.has(plan.id) && (
                <div className="mt-3 pt-3 border-t">
                  <ProceduresList
                    planId={plan.id}
                    appointments={appointments}
                    onUpdate={() =>
                      invalidate.invalidateTreatmentPlans(patientId)
                    }
                    procedures={(plan as any).procedures}
                  />
                  {showProcedureForm === plan.id && (
                    <CreateProcedureForm
                      treatmentPlanId={plan.id}
                      appointments={appointments}
                      onSuccess={() => {
                        setShowProcedureForm(null);
                        invalidate.invalidateTreatmentPlans(patientId);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CreateTreatmentPlanForm({
  patientId,
  onSuccess,
}: {
  patientId: string;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/treatment-plans/${patientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert("Failed to create treatment plan");
      }
    } catch (error) {
      alert("Failed to create treatment plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-lg p-4 mb-3 bg-slate-50"
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g., Dental Cleaning, Orthodontic Treatment"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onSuccess}
          className="px-3 py-1.5 text-sm border rounded hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}

function ProceduresList({
  planId,
  appointments,
  onUpdate,
  procedures,
}: {
  planId: string;
  appointments: Appointment[];
  onUpdate: () => void;
  procedures?: any[];
}) {
  const [createInvoiceFor, setCreateInvoiceFor] = useState<string | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isCompleting, setIsCompleting] = useState<string | null>(null);

  const handleComplete = async (procedureId: string) => {
    setIsCompleting(procedureId);
    try {
      const res = await fetch(`${API_BASE}/procedures/${procedureId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        onUpdate();
      } else {
        alert("Failed to complete procedure");
      }
    } catch (error) {
      alert("Failed to complete procedure");
    } finally {
      setIsCompleting(null);
    }
  };

  const handleCreateInvoice = async (procedureId: string) => {
    if (!invoiceAmount || parseFloat(invoiceAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    setIsCreatingInvoice(true);
    try {
      const res = await fetch(`${API_BASE}/procedures/${procedureId}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: invoiceAmount }),
      });
      if (res.ok) {
        setCreateInvoiceFor(null);
        setInvoiceAmount("");
        onUpdate();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create invoice");
      }
    } catch (error) {
      alert("Failed to create invoice");
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (res.ok) {
        onUpdate();
      } else {
        alert("Failed to mark invoice as paid");
      }
    } catch (error) {
      alert("Failed to mark invoice as paid");
    }
  };

  const handleDownloadPDF = (invoiceId: string) => {
    window.open(`${API_BASE}/invoices/${invoiceId}/pdf`, "_blank");
  };

  if (!procedures || procedures.length === 0)
    return <div className="text-sm text-slate-500">No procedures yet</div>;

  return (
    <div className="space-y-2">
      {procedures.map((proc: any) => (
        <div
          key={proc.id}
          className="text-sm border-l-2 border-blue-200 pl-3 py-2 space-y-2"
        >
          <div>
            <div className="font-medium">{proc.title}</div>
            {proc.description && (
              <div className="text-slate-600">{proc.description}</div>
            )}
            {proc.scheduledDate && (
              <div className="text-xs text-slate-500">
                Scheduled: {new Date(proc.scheduledDate).toLocaleDateString()}
              </div>
            )}
            {proc.appointment && (
              <div className="text-xs text-slate-500">
                Linked to: {proc.appointment.title} (
                {new Date(proc.appointment.datetime).toLocaleDateString()})
              </div>
            )}
            <div className="text-xs">
              Status: <span className="font-medium">{proc.status}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {proc.status !== "completed" && (
              <button
                onClick={() => handleComplete(proc.id)}
                disabled={isCompleting === proc.id}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isCompleting === proc.id ? "Completing..." : "Mark as Done"}
              </button>
            )}

            {proc.status === "completed" && !proc.invoice && (
              <>
                {createInvoiceFor === proc.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      placeholder="Amount"
                      className="border rounded px-2 py-1 text-xs w-24"
                    />
                    <button
                      onClick={() => handleCreateInvoice(proc.id)}
                      disabled={isCreatingInvoice}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isCreatingInvoice ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setCreateInvoiceFor(null);
                        setInvoiceAmount("");
                      }}
                      className="px-2 py-1 text-xs border rounded hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreateInvoiceFor(proc.id)}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Create Invoice
                  </button>
                )}
              </>
            )}

            {proc.invoice && (
              <div className="flex gap-2 items-center">
                <span className="text-xs">
                  Invoice: ${proc.invoice.amount.toFixed(2)} (
                  {proc.invoice.status})
                </span>
                <button
                  onClick={() => handleDownloadPDF(proc.invoice.id)}
                  className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Download PDF
                </button>
                {proc.invoice.status === "unpaid" && (
                  <button
                    onClick={() => handleMarkPaid(proc.invoice.id)}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Mark as Paid
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateProcedureForm({
  treatmentPlanId,
  appointments,
  onSuccess,
}: {
  treatmentPlanId: string;
  appointments: Appointment[];
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [appointmentId, setAppointmentId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/procedures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treatmentPlanId,
          appointmentId: appointmentId || undefined,
          title,
          description,
          scheduledDate: scheduledDate || undefined,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert("Failed to create procedure");
      }
    } catch (error) {
      alert("Failed to create procedure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-lg p-3 mt-3 bg-white"
    >
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Procedure Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="e.g., Cleaning, X-ray, Extraction"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Link to Appointment (optional)
          </label>
          <select
            value={appointmentId}
            onChange={(e) => setAppointmentId(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          >
            <option value="">None</option>
            {appointments.map((apt: Appointment) => (
              <option key={apt.id} value={apt.id}>
                {apt.title} - {new Date(apt.datetime).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Scheduled Date (optional)
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onSuccess}
          className="px-2 py-1 text-xs border rounded hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}

function CreateAppointmentForm({
  patientId,
  onSuccess,
}: {
  patientId: string;
  onSuccess: () => void;
}) {
  const { data: plansData } = useTreatmentPlans(patientId);
  const plans = plansData?.plans ?? [];
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("consultation");
  const [treatmentPlanId, setTreatmentPlanId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !datetime) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/appointments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          title,
          datetime,
          location,
          type,
          treatmentPlanId: treatmentPlanId || undefined,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert("Failed to create appointment");
      }
    } catch (error) {
      alert("Failed to create appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-lg p-4 mb-3 bg-slate-50"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g., Consultation, Follow-up"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date & Time
          </label>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            required
            min={new Date().toISOString().slice(0, 16)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g., Office 101"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="consultation">Consultation</option>
            <option value="follow-up">Follow-up</option>
            <option value="procedure">Procedure</option>
            <option value="check-up">Check-up</option>
          </select>
        </div>
        {plans.length > 0 && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Treatment Plan (optional)
            </label>
            <select
              value={treatmentPlanId}
              onChange={(e) => setTreatmentPlanId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {plans.map((plan: Plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setTitle("");
            setDatetime("");
            setLocation("");
            setType("consultation");
            setTreatmentPlanId("");
            onSuccess();
          }}
          className="px-3 py-1.5 text-sm border rounded hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title || !datetime}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}

export default function PatientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: patientId } = React.use(params);
  const invalidate = useInvalidateAdminQueries();
  const { data: patientData, isLoading: isLoadingPatient } =
    usePatient(patientId);

  const patient = patientData?.patient || null;
  const appointments = patientData?.appointments ?? [];
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [reschedule, setReschedule] = useState<{
    id: string;
    when: string;
  } | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [credentialEmail, setCredentialEmail] = useState("");
  const [credentialPassword, setCredentialPassword] = useState("");
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [credentialSuccess, setCredentialSuccess] = useState<string | null>(null);
  const [credentialError, setCredentialError] = useState<string | null>(null);

  useEffect(() => {
    if (patient?.email && credentialEmail !== patient.email) {
      setCredentialEmail(patient.email);
    }
  }, [patient?.email]);

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialEmail.trim()) {
      setCredentialError("Email is required");
      return;
    }

    setIsSavingCredentials(true);
    setCredentialError(null);
    setCredentialSuccess(null);

    try {
      const payload: Record<string, string> = {
        email: credentialEmail.trim(),
      };
      if (credentialPassword.trim()) {
        payload.password = credentialPassword.trim();
      }

      const res = await fetch(`${API_BASE}/patients/${patientId}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update credentials");
      }

      setCredentialSuccess("Credentials updated");
      setCredentialPassword("");
      invalidate.invalidatePatient(patientId);
    } catch (error: any) {
      console.error("Credential update error:", error);
      setCredentialError(error?.message || "Failed to update credentials");
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize messages from patient data
  useEffect(() => {
    if (patientData?.messages) {
      setMessages(patientData.messages);
    }
  }, [patientData?.messages]);

  useEffect(() => {
    let mounted = true;
    // Realtime updates via WebSocket
    // Use singleton socket - don't disconnect it, just change rooms
    const socket: any = connectSocket({ patientId });

    // Store socket reference globally for sendMessage
    (window as any).__adminPatientSocket = socket;
    (window as any).__adminPatientId = patientId;

    // Setup message listener with patientId filter to ensure we only get messages for this patient
    const messageHandler = ({ message }: any) => {
      // Only add message if it's for this patient
      if (mounted && message?.patientId === patientId) {
        setMessages((m) => [...m, message]);
      }
    };

    // Setup messages cleared listener
    const messagesClearedHandler = ({ patientId: clearedPatientId }: any) => {
      // Only clear messages if it's for this patient
      if (mounted && clearedPatientId === patientId) {
        setMessages([]);
      }
    };

    // Setup appointment event listeners
    const appointmentNewHandler = ({ appointment }: any) => {
      // Only process appointments for this patient
      if (mounted && appointment?.patientId === patientId) {
        invalidate.invalidatePatient(patientId);
      }
    };

    const appointmentUpdateHandler = ({ appointment }: any) => {
      // Only process appointments for this patient
      if (mounted && appointment?.patientId === patientId) {
        invalidate.invalidatePatient(patientId);
      }
    };

    const appointmentCancelledHandler = ({
      appointmentId,
      patientId: cancelledPatientId,
    }: any) => {
      // Only process cancellations for this patient
      if (mounted && cancelledPatientId === patientId) {
        invalidate.invalidatePatient(patientId);
      }
    };

    // Setup invoice event listeners
    const procedureCompletedHandler = ({ procedure }: any) => {
      if (mounted && procedure?.treatmentPlan?.patientId === patientId) {
        invalidate.invalidateTreatmentPlans(patientId);
      }
    };

    const invoiceCreatedHandler = ({ invoice }: any) => {
      if (
        mounted &&
        invoice?.procedure?.treatmentPlan?.patientId === patientId
      ) {
        invalidate.invalidateTreatmentPlans(patientId);
      }
    };

    const invoicePaidHandler = ({ invoice }: any) => {
      if (
        mounted &&
        invoice?.procedure?.treatmentPlan?.patientId === patientId
      ) {
        invalidate.invalidateTreatmentPlans(patientId);
      }
    };

    // Remove any existing listener first to prevent duplicates
    socket.off("message:new");
    socket.on("message:new", messageHandler);
    socket.off("messages:cleared");
    socket.on("messages:cleared", messagesClearedHandler);
    socket.off("appointment:new");
    socket.on("appointment:new", appointmentNewHandler);
    socket.off("appointment:update");
    socket.on("appointment:update", appointmentUpdateHandler);
    socket.off("appointment:cancelled");
    socket.on("appointment:cancelled", appointmentCancelledHandler);
    socket.off("procedure:completed");
    socket.on("procedure:completed", procedureCompletedHandler);
    socket.off("invoice:created");
    socket.on("invoice:created", invoiceCreatedHandler);
    socket.off("invoice:paid");
    socket.on("invoice:paid", invoicePaidHandler);

    return () => {
      mounted = false;
      // Only cleanup listener, don't disconnect socket
      socket.off("message:new", messageHandler);
      socket.off("messages:cleared", messagesClearedHandler);
      socket.off("appointment:new", appointmentNewHandler);
      socket.off("appointment:update", appointmentUpdateHandler);
      socket.off("appointment:cancelled", appointmentCancelledHandler);
      socket.off("procedure:completed", procedureCompletedHandler);
      socket.off("invoice:created", invoiceCreatedHandler);
      socket.off("invoice:paid", invoicePaidHandler);
      // Clear global reference if this is still the current patient
      if ((window as any).__adminPatientId === patientId) {
        (window as any).__adminPatientSocket = null;
        (window as any).__adminPatientId = null;
      }
    };
  }, [patientId]);

  useLayoutEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    if (!patientId) return;

    // Get current socket - should always exist due to useEffect
    let socket: any = (window as any).__adminPatientSocket;

    // If socket doesn't exist (shouldn't happen), create it
    if (!socket) {
      socket = connectSocket({ patientId });
      (window as any).__adminPatientSocket = socket;
    }

    const msgContent = message.trim();
    setMessage(""); // Clear input immediately

    // Use sendSocketEvent utility for automatic retry and queue management
    try {
      await sendSocketEvent(
        "message:send",
        { patientId, sender: "doctor", content: msgContent },
        { patientId },
        (ack: any) => {
          if (!ack?.ok) {
            // revert input on failure
            setMessage(msgContent);
            alert("Failed to send message");
          }
        }
      );
    } catch (error) {
      console.error("Error sending message:", error);
      setMessage(msgContent);
      alert("Failed to send message. It will be retried automatically.");
    }
  };

  const onMessageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const doReschedule = async () => {
    if (!reschedule?.id || !reschedule.when) return;
    const r = await fetch(
      `${API_BASE}/appointments/${reschedule.id}/reschedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datetime: reschedule.when }),
      }
    );
    const data = await r.json();
    // Invalidate cache to refetch
    invalidate.invalidatePatient(patientId);
    setReschedule(null);
  };

  if (isLoadingPatient)
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader />
      </div>
    );
  if (!patient) return <p className="text-red-600">Patient not found</p>;

  return (
    <div className="space-y-8">
      <section className="bg-white/80 backdrop-blur rounded-xl border shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
            <p className="text-slate-600">{patient.email}</p>
          </div>
          <PatientDiscountBadge patientId={patientId} />
        </div>
      </section>

      <section className="bg-white/80 backdrop-blur rounded-xl border shadow-sm p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Portal Access</h2>
            <p className="text-sm text-slate-600">
              Configure fallback email and password login for this patient.
            </p>
          </div>
          {credentialSuccess && (
            <span className="text-sm text-green-600">{credentialSuccess}</span>
          )}
        </div>
        {credentialError && (
          <p className="text-sm text-red-500 mt-2">{credentialError}</p>
        )}
        <form onSubmit={handleCredentialSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={credentialEmail}
                onChange={(e) => setCredentialEmail(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={credentialPassword}
                onChange={(e) => setCredentialPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                minLength={6}
              />
              <p className="text-xs text-slate-500 mt-1">
                Minimum 6 characters. Share securely with the patient.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-sm border rounded hover:bg-slate-100"
              onClick={() => {
                setCredentialError(null);
                setCredentialSuccess(null);
                setCredentialEmail(patient.email || "");
                setCredentialPassword("");
              }}
              disabled={isSavingCredentials}
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isSavingCredentials}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSavingCredentials ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      <TreatmentPlansSection
        patientId={patientId}
        appointments={appointments}
      />

      <section className="bg-white/80 backdrop-blur rounded-xl border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Appointments</h2>
          <button
            onClick={() => setShowAppointmentForm(!showAppointmentForm)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showAppointmentForm ? "Cancel" : "+ New Appointment"}
          </button>
        </div>

        {showAppointmentForm && (
          <CreateAppointmentForm
            patientId={patientId}
            onSuccess={() => {
              setShowAppointmentForm(false);
              invalidate.invalidatePatient(patientId);
            }}
          />
        )}

        {appointments.length === 0 ? (
          <p className="text-slate-500">No appointments</p>
        ) : (
          <ul className="space-y-2 mt-3">
            {appointments.map((a: Appointment) => (
              <li
                key={a.id}
                className="border rounded-lg p-3 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div>
                  <div className="font-medium text-slate-900">{a.title}</div>
                  <div className="text-sm text-slate-600">
                    {new Date(a.datetime).toLocaleString()}{" "}
                    {a.location ? `· ${a.location}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {reschedule?.id === a.id ? (
                    <>
                      <input
                        type="datetime-local"
                        className="border rounded px-2 py-1 text-sm"
                        value={reschedule.when}
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(e) =>
                          setReschedule({ id: a.id, when: e.target.value })
                        }
                      />
                      <button
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded shadow"
                        onClick={doReschedule}
                        disabled={!reschedule.when}
                      >
                        Save
                      </button>
                      <button
                        className="px-2 py-1 text-sm text-slate-700"
                        onClick={() => setReschedule(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="px-2 py-1 text-sm border rounded hover:bg-slate-100"
                        onClick={() => {
                          const iso = new Date(a.datetime)
                            .toISOString()
                            .slice(0, 16);
                          setReschedule({ id: a.id, when: iso });
                        }}
                      >
                        Reschedule
                      </button>
                      <button
                        className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        onClick={async () => {
                          if (
                            !confirm(
                              "Are you sure you want to cancel this appointment?"
                            )
                          )
                            return;
                          try {
                            const res = await fetch(
                              `${API_BASE}/appointments/${a.id}`,
                              {
                                method: "DELETE",
                              }
                            );
                            if (res.ok) {
                              invalidate.invalidatePatient(patientId);
                            } else {
                              alert("Failed to cancel appointment");
                            }
                          } catch (error) {
                            alert("Failed to cancel appointment");
                          }
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white/80 backdrop-blur rounded-xl border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Messages</h2>
          {messages.length > 0 && (
            <button
              onClick={async () => {
                if (
                  !confirm(
                    "Are you sure you want to clear all messages with this patient? This action cannot be undone."
                  )
                )
                  return;

                // Get current socket - should always exist due to useEffect
                let socket: any = (window as any).__adminPatientSocket;

                // If socket doesn't exist (shouldn't happen), create it
                if (!socket) {
                  socket = connectSocket({ patientId });
                  (window as any).__adminPatientSocket = socket;
                }

                // Use sendSocketEvent utility for automatic retry and queue management
                try {
                  await sendSocketEvent(
                    "messages:clear",
                    { patientId },
                    { patientId },
                    (ack: any) => {
                      // Silently handle - messages will be cleared via socket event
                      if (!ack?.ok) {
                        console.error("Failed to clear messages:", ack?.error);
                      }
                    }
                  );
                } catch (error) {
                  console.error("Error clearing messages:", error);
                  // Silently fail, will retry automatically
                }
              }}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50 transition"
            >
              Clear chat
            </button>
          )}
        </div>
        {messages.length === 0 ? (
          <div className="border rounded-lg p-8 bg-slate-50 text-center">
            <div className="text-slate-400 text-4xl mb-3">💬</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No messages yet
            </h3>
            <p className="text-slate-600 mb-4">
              Start the conversation by sending the first message
            </p>
          </div>
        ) : (
          <div
            ref={messagesContainerRef}
            className="border rounded-lg p-3 space-y-2 max-h-80 overflow-auto bg-white"
          >
            {messages.map((m: Message) => (
              <div
                key={m.id}
                className={
                  "text-sm flex " +
                  (m.sender === "doctor" ? "justify-end" : "justify-start")
                }
              >
                <div
                  className={
                    (m.sender === "doctor"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-900") +
                    " px-3 py-2 rounded-xl shadow-sm max-w-[70%]"
                  }
                >
                  {m.content}
                  <div className="mt-1 text-[10px] opacity-70 text-right">
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={onMessageKeyDown}
            placeholder={
              messages.length === 0
                ? "Write your first message..."
                : "Type a message"
            }
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!message.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </section>
    </div>
  );
}
