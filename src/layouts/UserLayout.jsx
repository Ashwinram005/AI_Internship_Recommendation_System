import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { UserRound, Search, Cpu, Briefcase, Menu } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import {
  getProfileDisplayName,
  getProfileInitials,
} from "../routes/routeUtils";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const crumb = location.pathname.startsWith("/user/jobs/")
    ? "Job Details"
    : (breadcrumbMap[location.pathname] ?? "Candidate");
  const displayName = getProfileDisplayName(user);
  const initials = getProfileInitials(user);
  const profilePhoto = user?.photoURL || auth.currentUser?.photoURL || "";

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const links = [
    { to: "/user/jobs", label: "Browse Jobs", icon: Search },
    { to: "/user/matcher", label: "AI Matcher", icon: Cpu },
    { to: "/user/applied", label: "Applied Jobs", icon: Briefcase },
    { to: "/user/profile", label: "Profile", icon: UserRound },
  ];

  return (
    <div className="app-layout">
      {mobileOpen ? (
        <button
          className="mobile-sidebar-overlay lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar overlay"
        />
      ) : null}

      <Sidebar
        title="Candidate"
        roleLabel="Candidate"
        links={links}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="app-header">
          <div className="flex items-center gap-3 text-sm">
            <button
              className="saas-btn saas-btn-secondary p-2 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>
            <span className="text-slate-700 font-semibold">{crumb}</span>
          </div>
          <div className="flex items-center gap-3">
            {profilePhoto ? (
              <img
                src={profilePhoto}
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
