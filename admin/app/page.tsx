"use client";

import Link from "next/link";
import { useDashboardStats } from "@/lib/admin-queries";
import { Loader } from "./components/Loader";

export default function Dashboard() {
  const { data: stats, isLoading: loading } = useDashboardStats();

  const statsData = stats || {
    totalPatients: 0,
    totalAppointments: 0,
    upcomingAppointments: 0,
    recentMessages: 0,
  };

  if (loading) {
    return (
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
          <div className="flex items-center justify-center py-12">
            <Loader />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/patients" className="block">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="text-sm text-slate-600 mb-1">Total Patients</div>
              <div className="text-3xl font-bold text-slate-900">
                {statsData.totalPatients}
              </div>
            </div>
          </Link>

          <Link href="/appointments" className="block">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="text-sm text-slate-600 mb-1">
                Total Appointments
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {statsData.totalAppointments}
              </div>
            </div>
          </Link>

          <Link href="/appointments" className="block">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="text-sm text-slate-600 mb-1">Upcoming</div>
              <div className="text-3xl font-bold text-blue-600">
                {statsData.upcomingAppointments}
              </div>
            </div>
          </Link>

          <Link href="/chats" className="block">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="text-sm text-slate-600 mb-1">Recent Messages</div>
              <div className="text-3xl font-bold text-slate-900">
                {statsData.recentMessages}
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/patients"
                className="block px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium transition-colors"
              >
                View All Patients
              </Link>
              <Link
                href="/appointments"
                className="block px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 font-medium transition-colors"
              >
                View All Appointments
              </Link>
              <Link
                href="/chats"
                className="block px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 font-medium transition-colors"
              >
                View Chats
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="text-slate-500 text-sm">
              Activity feed coming soon...
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
