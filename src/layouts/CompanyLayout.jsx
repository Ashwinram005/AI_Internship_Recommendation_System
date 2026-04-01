import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BarChart2, PlusCircle, Layers, UserRound, Menu } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import {
  getProfileDisplayName,
  getProfileInitials,
} from "../routes/routeUtils";

const breadcrumbMap = {
  "/company": "Overview",
  "/company/post-job": "Post a Job",
  "/company/manage-jobs": "Manage Jobs",
  "/company/profile": "Profile",
};

export default function CompanyLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const crumb = breadcrumbMap[location.pathname] ?? "Company";
  const displayName = getProfileDisplayName(user);
  const initials = getProfileInitials(user);
  const profilePhoto = user?.photoURL || auth.currentUser?.photoURL || "";

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const links = [
    { to: "/company", label: "Overview", icon: BarChart2, exact: true },
    { to: "/company/post-job", label: "Post a Job", icon: PlusCircle },
    { to: "/company/manage-jobs", label: "Manage Jobs", icon: Layers },
    { to: "/company/profile", label: "Profile", icon: UserRound },
  ];

  return (
    <div className="app-layout min-h-screen bg-[#FAF8FF] relative overflow-hidden">
      {/* Ambient Blobs */}
      <div className="stitch-ambient-blob absolute top-0 -right-24 w-96 h-96 bg-blue-400/10 rounded-full" />
      <div className="stitch-ambient-blob absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-300/10 rounded-full" />

      {mobileOpen ? (
        <button
          className="mobile-sidebar-overlay lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar overlay"
        />
      ) : null}

      <Sidebar
        title="Employment"
        roleLabel="Employer"
        links={links}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 relative z-10 lg:pl-[286px]">
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
              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-sm">
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
