import { Outlet, useLocation } from "react-router-dom";
import { UserRound, Search, Cpu, Home, Briefcase } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import { useAuth } from "../context/AuthContext";
import { getProfileDisplayName, getProfileInitials } from "../routes/routeUtils";

const breadcrumbMap = {
  "/user": "Jobs",
  "/user/profile": "Profile",
  "/user/jobs": "Jobs",
  "/user/matcher": "Matcher",
  "/user/applied": "Applied Jobs",
};

export default function UserLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const crumb = location.pathname.startsWith("/user/jobs/")
    ? "Job Details"
    : (breadcrumbMap[location.pathname] ?? "Candidate");
  const displayName = getProfileDisplayName(user);
  const initials = getProfileInitials(user);

  const links = [
    { to: "/user/jobs", label: "Browse Jobs", icon: Search },
    { to: "/user/matcher", label: "AI Matcher", icon: Cpu },
    { to: "/user/applied", label: "Applied Jobs", icon: Briefcase },
    { to: "/user/profile", label: "Profile", icon: UserRound },
  ];

  return (
    <div className="app-layout">
      <Sidebar title="Candidate" roleLabel="Candidate" links={links} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="app-header">
          <div className="flex items-center gap-2 text-sm">
            <Home size={16} className="text-slate-400" />
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-medium">{crumb}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">{displayName}</span>
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-semibold text-indigo-600 text-sm">
                {initials}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
