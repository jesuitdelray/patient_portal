"use client";
import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { usePatients } from "@/lib/admin-queries";
import { Loader } from "@/app/components/Loader";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Patient = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

// Use admin API routed via Next

function PatientsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10) || 1;
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10) || 10;

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (page > 1) p.set("page", String(page));
    if (pageSize !== 10) p.set("pageSize", String(pageSize));
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [q, page, pageSize]);

  const { data, isLoading: loading } = usePatients(queryString);
  const patients = data?.patients ?? [];
  const total = data?.total ?? 0;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirm, setFormConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormPassword("");
    setFormConfirm("");
    setFormError(null);
  };

  const createPatientMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      phone?: string | null;
      password: string;
    }) => {
      const res = await fetch(`${API_BASE}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create patient");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "patients"], exact: false });
    },
  });

  const handleCreatePatient = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setFormError("Name, email, and password are required.");
      return;
    }

    if (formPassword.trim().length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (formPassword.trim() !== formConfirm.trim()) {
      setFormError("Password and confirmation do not match.");
      return;
    }

    try {
      await createPatientMutation.mutateAsync({
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() ? formPhone.trim() : null,
        password: formPassword.trim(),
      });
      resetForm();
      setShowCreateModal(false);
      if (typeof window !== "undefined") {
        window.alert("Patient created successfully.");
      }
    } catch (error: any) {
      setFormError(error?.message || "Failed to create patient.");
    }
  };

  const setParam = (next: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">All patients</h1>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          defaultValue={q}
          onChange={(e) => setParam({ q: e.target.value, page: 1 })}
          placeholder="Search name, email, phone"
          className="border rounded px-3 py-2 text-sm w-64"
        />
        <label className="text-sm text-gray-600">Page size</label>
        <select
          value={pageSize}
          onChange={(e) =>
            setParam({ pageSize: Number(e.target.value), page: 1 })
          }
          className="border rounded px-2 py-2 text-sm"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            + New patient
          </button>
          <div className="text-sm text-gray-600">{total} total</div>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p: Patient) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-4">{p.name}</td>
                    <td className="py-2 pr-4">{p.email}</td>
                    <td className="py-2 pr-4">{p.phone || "—"}</td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/patients/${p.id}`}
                        className="text-blue-600"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setParam({ page: Math.max(1, page - 1) })}
            >
              Prev
            </button>
            <span className="text-sm">Page {page}</span>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={patients.length < pageSize || page * pageSize >= total}
              onClick={() => setParam({ page: page + 1 })}
            >
              Next
            </button>
          </div>
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Create new patient</h2>
              <button
                onClick={() => {
                  if (!createPatientMutation.isPending) {
                    setShowCreateModal(false);
                  }
                }}
                className="text-slate-500 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreatePatient} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {formError}
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jane Doe"
                  disabled={createPatientMutation.isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="patient@example.com"
                  disabled={createPatientMutation.isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 (555) 000-0000"
                  disabled={createPatientMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  disabled={createPatientMutation.isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={formConfirm}
                  onChange={(e) => setFormConfirm(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Repeat password"
                  minLength={6}
                  disabled={createPatientMutation.isPending}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!createPatientMutation.isPending) {
                      setShowCreateModal(false);
                    }
                  }}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-slate-100"
                  disabled={createPatientMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  disabled={createPatientMutation.isPending}
                >
                  {createPatientMutation.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      }
    >
      <PatientsPageInner />
    </Suspense>
  );
}
