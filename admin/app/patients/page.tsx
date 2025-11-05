"use client";
import React, { Suspense, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { usePatients } from "@/lib/admin-queries";
import { Loader } from "@/app/components/Loader";

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
      <div className="mb-3 flex items-center gap-3">
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
        <div className="ml-auto text-sm text-gray-600">{total} total</div>
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
