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
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20">
          <div className="font-bold text-lg tracking-tight font-headline">
            Get<span className="text-[var(--color-primary)]">Landed</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
