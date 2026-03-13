import { Briefcase, FileText, ClipboardList, Clock3 } from "lucide-react";

export default function UserDashboard() {
  const cards = [
    { label: "Active Applications", value: "07", icon: ClipboardList },
    { label: "Saved Resumes", value: "03", icon: FileText },
    { label: "Pending Reviews", value: "04", icon: Clock3 },
    { label: "Open Matches", value: "16", icon: Briefcase },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Candidate Workbench
        </h1>
        <p className="text-slate-500 mt-1">
          Track opportunities, applications, and progress in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((item) => {
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900">Today</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              2 applications moved to{" "}
              <span className="font-semibold">In Review</span>.
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              1 application deadline approaching in the next 24 hours.
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              Resume profile was used in 3 recent submissions.
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-lg font-bold text-slate-900">Next Best Action</h2>
          <p className="text-sm text-slate-600 mt-3">
            Review your pending applications and withdraw outdated submissions
            to keep your pipeline clean.
          </p>
          <button className="saas-btn saas-btn-primary w-full mt-4">
            Go to Applications
          </button>
        </div>
      </div>
    </div>
  );
}
