"use client";

import { Suspense, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/api";
import Link from "next/link";
import { useAppointments, useInvalidateAdminQueries } from "@/lib/admin-queries";
import { Loader } from "@/app/components/Loader";

function AppointmentsContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all"
  );
  const invalidate = useInvalidateAdminQueries();

  const paramsString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    return params.toString() ? `?${params.toString()}` : "";
  }, [search, statusFilter]);

  const { data, isLoading: loading } = useAppointments(paramsString);
  const appointments = data?.appointments || [];
  const stats = data?.stats || {
    scheduled: 0,
    upcoming: 0,
    missed: 0,
    completed: 0,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (apt: any) => {
    const now = new Date();
    const aptDate = new Date(apt.datetime);
    if (aptDate > now) {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
          Upcoming
        </span>
      );
    }
    if (apt.requests?.length > 0 && apt.requests[0].status === "approved") {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
          Completed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
        Missed
      </span>
    );
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">All Appointments</h1>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="text-sm text-slate-600 mb-1">Scheduled</div>
            <div className="text-2xl font-bold text-slate-900">
              {stats.scheduled}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="text-sm text-slate-600 mb-1">Upcoming</div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.upcoming}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="text-sm text-slate-600 mb-1">Missed</div>
            <div className="text-2xl font-bold text-red-600">
              {stats.missed}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="text-sm text-slate-600 mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by patient name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Appointments</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="missed">Missed</option>
            </select>
          </div>
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader />
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-slate-400 mb-2">No appointments found</div>
            <div className="text-sm text-slate-500">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "No appointments have been scheduled yet"}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-200">
              {appointments.map((apt: any) => (
                <Link
                  key={apt.id}
                  href={`/patients/${apt.patient.id}`}
                  className="block p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-sm font-semibold text-slate-700">
                          {apt.patient.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {apt.patient.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {apt.patient.email}
                          </div>
                        </div>
                        {getStatusBadge(apt)}
                      </div>
                      <div className="ml-13">
                        <div className="font-medium text-slate-900">
                          {apt.title}
                        </div>
                        <div className="text-sm text-slate-600">
                          {formatDate(apt.datetime)}
                        </div>
                        {apt.location && (
                          <div className="text-sm text-slate-500">
                            📍 {apt.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (
                          !confirm(
                            "Are you sure you want to cancel this appointment?"
                          )
                        )
                          return;
                        try {
                          const res = await fetch(
                            `${API_BASE}/appointments/${apt.id}`,
                            {
                              method: "DELETE",
                            }
                          );
                          if (res.ok) {
                            // Invalidate cache to refetch
                            invalidate.invalidateAppointments(paramsString);
                          } else {
                            alert("Failed to cancel appointment");
                          }
                        } catch (error) {
                          alert("Failed to cancel appointment");
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 ml-4"
                    >
                      Cancel
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 p-8 flex items-center justify-center">
          <Loader />
        </div>
      }
    >
      <AppointmentsContent />
    </Suspense>
  );
}
