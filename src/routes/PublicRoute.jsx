import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDefaultRouteByRole } from "./routeUtils";

export default function PublicRoute() {
  const { user, loading } = useAuth();
  const suppressRedirect =
    sessionStorage.getItem("auth_redirect_suppressed") === "1";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (user && !suppressRedirect) {
    return <Navigate to={getDefaultRouteByRole(user.role)} replace />;
  }

  return <Outlet />;
}
