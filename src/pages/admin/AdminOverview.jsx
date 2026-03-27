import { useState, useEffect } from "react";
import {
  Users,
  Building,
  Briefcase,
  Activity,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import { getAllPostings } from "../../services/postingService";
import { getAllUsers, getAllCompanies } from "../../services/userProfileService";

export default function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, companies: 0, jobs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const [users, companies, jobs] = await Promise.all([
          getAllUsers(),
          getAllCompanies(),
          getAllPostings(),
        ]);
        setStats({
          users: users.length,
          companies: companies.length,
          jobs: jobs.length,
        });
      } catch (err) {
        console.error("Failed to load admin stats:", err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const cards = [
    {
      label: "Active Users",
      value: stats.users,
      icon: Users,
      trend: "+12.5%",
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
    {
      label: "Employers",
      value: stats.companies,
      icon: Building,
      trend: "+2.1%",
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
    {
      label: "Job Listings",
      value: stats.jobs,
      icon: Briefcase,
      trend: "-0.5%",
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="max-w-5xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 font-[Poppins]">
          Admin Overview
        </h1>
        <p className="text-slate-500 mt-1">
          Monitor platform activity and system health.
        </p>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="glass-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{c.label}</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">
                    {c.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-lg ${c.bg}`}>
                  <Icon size={20} className={c.color} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${c.trend.startsWith("+") ? "text-emerald-500" : "text-slate-400"}`}
                >
                  {c.trend}
                </span>
                <span className="text-xs text-slate-400">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Health & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
            <Activity size={24} />
          </div>
          <h3 className="mt-4 font-medium text-slate-900">System Status</h3>
          <p className="text-sm text-slate-500 mt-1">99.98% Operational</p>
          <span className="mt-3 saas-badge badge-success flex items-center gap-1.5">
            <CheckCircle2 size={12} />
            Healthy
          </span>
          <p className="mt-3 text-xs text-slate-400 flex items-center gap-1">
            <RefreshCcw size={10} /> Last check 2m ago
          </p>
        </div>

        <div className="glass-card lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-medium text-slate-900">Platform Activity</h3>
            <button className="text-sm text-indigo-500 hover:text-indigo-600 font-medium">
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              {
                text: "New employer registered: TechFlow Labs",
                time: "2m ago",
                status: "green",
              },
              {
                text: "AI matching engine completed batch analysis",
                time: "14m ago",
                status: "slate",
              },
              {
                text: "Critical security audit passed with 0 warnings",
                time: "1h ago",
                status: "green",
              },
              {
                text: "System maintenance scheduled for March 15",
                time: "3h ago",
                status: "amber",
              },
            ].map((log, i) => (
              <div
                key={i}
                className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${log.status === "green" ? "bg-green-500" : log.status === "amber" ? "bg-amber-400" : "bg-slate-200"}`}
                  />
                  <p className="text-sm text-slate-600">{log.text}</p>
                </div>
                <span className="text-xs text-slate-400">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
