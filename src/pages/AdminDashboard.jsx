import { Building2, ClipboardList, ShieldCheck, Users } from "lucide-react";

export default function AdminDashboard() {
  const cards = [
    { label: "Platform Users", value: "0", icon: Users },
    { label: "Companies", value: "0", icon: Building2 },
    { label: "Applications", value: "0", icon: ClipboardList },
    { label: "Compliance Alerts", value: "0", icon: ShieldCheck },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Governance Console</h1>
        <p className="text-slate-500 mt-1">Monitor platform health, access patterns, and operational controls.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass-card p-5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Icon size={16} />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-3">{item.value}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{item.label}</p>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-slate-900">Operational Controls</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">Review suspicious account activity</div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">Monitor role-based access configuration</div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">Audit posting and application lifecycle compliance</div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">Validate moderation and deletion operations</div>
        </div>
      </div>
    </div>
  );
}
