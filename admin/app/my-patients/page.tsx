"use client";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { API_BASE, connectEvents } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import {
  useDoctorPatients,
  useInvalidateAdminQueries,
} from "@/lib/admin-queries";
import { Loader } from "@/app/components/Loader";

type Patient = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

import * as React from "react";

function MyPatientsPageInner() {
  const searchParams = useSearchParams();
  const doctorIdParam = searchParams.get("doctorId") || undefined;
  const doctorId = doctorIdParam || "seed"; // mock doctor
  const { data, isLoading: loading } = useDoctorPatients(doctorId);
  const patients = data?.patients ?? [];
  const invalidate = useInvalidateAdminQueries();

  useEffect(() => {
    // realtime subscribe for doctor
    const es = connectEvents({ doctorId });
    es.addEventListener("doctor.assign", () => {
      // Invalidate cache to refetch
      invalidate.invalidateDoctorPatients(doctorId);
    });
    return () => es.close();
  }, [doctorId, invalidate]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My patients</h1>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      ) : (
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
                    <Link href={`/patients/${p.id}`} className="text-blue-600">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MyPatientsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      }
    >
      <MyPatientsPageInner />
    </Suspense>
  );
}
