import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { getDefaultRouteByRole } from "../routes/routeUtils";
import { Bird, Eye, Mail, Lock } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, resolveUserProfile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    if (err?.code === "auth/configuration-not-found") return "Firebase Auth is not fully configured.";
    if (err?.code === "auth/invalid-credential") return "Invalid email or password.";
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
    <div className="min-h-screen bg-[#f8f9fd] flex items-center justify-center p-4 md:p-8 font-body">
      <div className="w-full max-w-6xl h-auto min-h-[700px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Panel: Onboarding (Blue) */}
        <div className="lg:w-[40%] bg-gradient-to-br from-[#0066ff] to-[#004dc2] p-12 flex flex-col items-center justify-center text-center text-white relative">
          <div className="relative z-10 space-y-8">
            <h1 className="text-5xl font-bold tracking-tight font-headline">New Here?</h1>
            <p className="text-blue-50/80 text-xl font-medium leading-relaxed max-w-xs mx-auto">
              Sign up and discover a great amount of new opportunities!
            </p>
            <div className="pt-4">
              <Link 
                to="/signup"
                className="inline-block px-12 py-4 border-2 border-white/40 rounded-full font-bold text-lg hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                SIGN UP
              </Link>
            </div>
          </div>
          
          {/* Subtle decorative background element */}
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-white rounded-full blur-[100px]"></div>
          </div>
        </div>

        {/* Right Panel: Login Form (White) */}
        <div className="lg:w-[60%] p-8 md:p-16 flex flex-col justify-center bg-white">
          <div className="w-full max-w-md mx-auto space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Bird className="text-blue-600" size={24} />
                </div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Welcome Back!</span>
              </div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tight font-headline">Hello Again!</h2>
              <p className="text-slate-500 text-lg font-medium">
                Sign in to manage your job applications and saved opportunities.
              </p>
            </div>

            <form onSubmit={onEmailLogin} className="space-y-5">
              <div className="space-y-1.5">
                <div className="relative flex items-center group">
                  <Mail className="absolute left-5 text-slate-400 transition-colors group-focus-within:text-blue-500" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Email Address"
                    className="w-full pl-14 pr-6 py-5 bg-[#f0f4f8] border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="relative flex items-center group">
                  <Lock className="absolute left-5 text-slate-400 transition-colors group-focus-within:text-blue-500" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Password"
                    className="w-full pl-14 pr-14 py-5 bg-[#f0f4f8] border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Eye size={20} />
                  </button>
                </div>
                <div className="text-right px-1">
                  <a href="#" className="text-sm font-bold text-slate-400 hover:text-blue-500 transition-colors">Forgot Password?</a>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-2xl text-sm border border-red-100 bg-red-50 text-red-600 font-semibold animate-shake">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-70 uppercase tracking-wide"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase font-extrabold tracking-[0.2em] text-slate-300">
                <span className="bg-white px-4">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onGoogleLogin}
              disabled={googleLoading}
              className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors active:scale-[0.98] disabled:opacity-70"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              <span>Google</span>
            </button>

            <div className="text-center pt-2">
              <p className="text-slate-500 font-bold">
                Don't have an account? 
                <Link to="/signup" className="text-blue-600 hover:underline ml-2">Sign Up</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
