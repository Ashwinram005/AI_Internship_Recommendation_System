import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail, BriefcaseBusiness } from "lucide-react";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { getDefaultRouteByRole } from "../routes/routeUtils";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, resolveUserProfile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem("auth_redirect_suppressed");
    const notice =
      location.state?.authNotice || sessionStorage.getItem("auth_notice");
    if (notice) {
      setError(notice);
      sessionStorage.removeItem("auth_notice");
    }
  }, [location.state]);

  const getFriendlyLoginError = (err) => {
    if (err?.code === "auth/configuration-not-found") {
      return "Firebase Auth is not fully configured for this project. In Firebase Console, enable Authentication (Email/Password and Google), then restart the app.";
    }

    if (err?.code === "auth/unauthorized-domain") {
      return "This domain is not authorized in Firebase Auth. Add localhost to Authentication > Settings > Authorized domains.";
    }

    return err?.message || "Unable to sign in.";
  };

  const onEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const appUser = await resolveUserProfile(cred.user);
      login(appUser);
      navigate(getDefaultRouteByRole(appUser.role), { replace: true });
    } catch (err) {
      setError(getFriendlyLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  const onGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      const appUser = await resolveUserProfile(cred.user);
      login(appUser);
      navigate(getDefaultRouteByRole(appUser.role), { replace: true });
    } catch (err) {
      setError(getFriendlyLoginError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-100">
      <section className="hidden lg:flex flex-col justify-between p-10 bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <BriefcaseBusiness size={19} />
          </div>
          <div>
            <p className="font-bold">TalentOps</p>
            <p className="text-xs text-slate-300">
              Hiring & Candidate Platform
            </p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Access your recruitment workspace.
          </h1>
          <p className="text-slate-300 mt-4">
            Manage roles, applications, and hiring operations from one secure
            console.
          </p>
        </div>

        <p className="text-xs text-slate-400">
          Secure login. Role-aware access. Production workflow.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md glass-card p-7 sm:p-8 bg-white">
          <h2 className="text-2xl font-bold text-slate-900">Sign In</h2>
          <p className="text-sm text-slate-500 mt-1">
            Continue to your dashboard
          </p>

          <form onSubmit={onEmailLogin} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-600">
                Email
              </label>
              <div className="relative mt-1.5">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              className="saas-btn saas-btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <button
              type="button"
              onClick={onGoogleLogin}
              className="saas-btn saas-btn-secondary w-full"
              disabled={googleLoading}
            >
              {googleLoading ? "Connecting..." : "Continue with Google"}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
              {error}
            </div>
          )}

          <p className="mt-6 text-sm text-slate-500 text-center">
            No account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-slate-900 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
