import { Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Building, Users, Home } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import { useAuth } from "../context/AuthContext";
import { getProfileDisplayName, getProfileInitials } from "../routes/routeUtils";

const breadcrumbMap = {
  "/admin": "Overview",
  "/admin/companies": "Companies",
  "/admin/users": "Users",
};

export default function AdminLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const crumb = breadcrumbMap[location.pathname] ?? "Admin";
  const displayName = getProfileDisplayName(user);
  const initials = getProfileInitials(user);

  const links = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/admin/companies", label: "Companies", icon: Building },
    { to: "/admin/users", label: "Users", icon: Users },
  ];

  return (
    <div className="app-layout">
      <Sidebar title="Administration" roleLabel="Gov. Admin" links={links} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="app-header">
          <div className="flex items-center gap-2 text-sm">
            <Home size={16} className="text-slate-400" />
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-medium">{crumb}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="saas-badge badge-success">Live</span>
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
