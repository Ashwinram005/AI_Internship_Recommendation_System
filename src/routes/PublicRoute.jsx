import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLoader from "../components/ui/PageLoader";
import { getDefaultRouteByRole } from "./routeUtils";

export default function PublicRoute() {
  const { user, loading } = useAuth();
  const suppressRedirect =
    sessionStorage.getItem("auth_redirect_suppressed") === "1";

  if (loading) {
    return (
      <PageLoader
        variant="fullscreen"
        label="Loading"
        sublabel="One moment…"
      />
    );
  }

  if (user && !suppressRedirect) {
    return <Navigate to={getDefaultRouteByRole(user.role)} replace />;
  }

  return <Outlet />;
}
