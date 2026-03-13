import {
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";

export default function CompanyDashboard() {
  const metrics = [
    { label: "Open Roles", value: "12", icon: BriefcaseBusiness },
    { label: "Total Applicants", value: "148", icon: UsersRound },
    { label: "Interview Queue", value: "23", icon: CalendarClock },
    { label: "Hires This Month", value: "06", icon: ClipboardCheck },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hiring Operations</h1>
        <p className="text-slate-500 mt-1">
          A focused overview of role performance and applicant throughput.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass-card p-5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Icon size={16} />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-3">
                {item.value}
              </p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="text-lg font-bold text-slate-900">
            Recruiting Pipeline Health
          </h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
              Roles with low applicant quality: 2
            </div>
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
              Roles nearing closure this week: 5
            </div>
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
              Avg candidate response time: 19h
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-lg font-bold text-slate-900">Actions</h2>
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button className="saas-btn saas-btn-primary justify-start">
              Post New Role
            </button>
            <button className="saas-btn saas-btn-secondary justify-start">
              Review Rejected Data
            </button>
            <button className="saas-btn saas-btn-secondary justify-start">
              Export Hiring Snapshot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
