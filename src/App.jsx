import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AILanding from "./pages/AILanding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";
import { getDefaultRouteByRole } from "./routes/routeUtils";

// Layouts
import UserLayout from "./layouts/UserLayout";
import CompanyLayout from "./layouts/CompanyLayout";
import AdminLayout from "./layouts/AdminLayout";

// User Pages
import MyResumes from "./pages/user/MyResumes";
import JobsList from "./pages/user/JobsList";
import JobDetails from "./pages/user/JobDetails";
import JobMatcher from "./pages/user/JobMatcher";
import AppliedJobs from "./pages/user/AppliedJobs";

// Company Pages
import CompanyOverview from "./pages/company/CompanyOverview";
import PostJob from "./pages/company/PostJob";
import ManageJobs from "./pages/company/ManageJobs";
import CompanyProfile from "./pages/company/CompanyProfile";

// Admin Pages
import AdminOverview from "./pages/admin/AdminOverview";
import ManageCompanies from "./pages/admin/ManageCompanies";
import ManageUsers from "./pages/admin/ManageUsers";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicRoute />}>
        <Route path="/" element={<AILanding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* User Routes */}
      <Route path="/user" element={<ProtectedRoute allowedRoles={["user"]} />}>
        <Route element={<UserLayout />}>
          <Route index element={<Navigate to="jobs" replace />} />
          <Route path="profile" element={<MyResumes />} />
          <Route path="jobs" element={<JobsList />} />
          <Route path="jobs/:jobId" element={<JobDetails />} />
          <Route path="applied" element={<AppliedJobs />} />
          <Route path="matcher" element={<JobMatcher />} />
        </Route>
      </Route>

      {/* Company Routes */}
      <Route
        path="/company"
        element={<ProtectedRoute allowedRoles={["company"]} />}
      >
        <Route element={<CompanyLayout />}>
          <Route index element={<CompanyOverview />} />
          <Route path="post-job" element={<PostJob />} />
          <Route path="manage-jobs" element={<ManageJobs />} />
          <Route path="profile" element={<CompanyProfile />} />
        </Route>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="companies" element={<ManageCompanies />} />
          <Route path="users" element={<ManageUsers />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={
          <Navigate
            to={user ? getDefaultRouteByRole(user.role) : "/"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;
