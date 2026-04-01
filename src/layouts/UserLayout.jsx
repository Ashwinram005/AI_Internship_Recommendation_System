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
    <div className="app-layout min-h-screen bg-[#FAF8FF] relative overflow-hidden">
      {/* Ambient Blobs */}
      <div className="stitch-ambient-blob absolute -top-24 -left-24 w-96 h-96 bg-cyan-400/10 rounded-full" />
      <div className="stitch-ambient-blob absolute top-1/2 -right-24 w-80 h-80 bg-blue-500/10 rounded-full" />
      <div className="stitch-ambient-blob absolute -bottom-24 left-1/3 w-64 h-64 bg-indigo-400/10 rounded-full" />

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
      <div className="flex-1 flex flex-col min-w-0 relative z-10 lg:pl-[286px]">
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
