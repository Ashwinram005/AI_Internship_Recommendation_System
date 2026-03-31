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
    <div className="bg-stitch-surface font-body text-stitch-on-surface min-h-screen relative overflow-hidden flex flex-col">
      {/* Ambient Gradient Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-stitch-primary-container opacity-10 stitch-ambient-blob"></div>
      <div className="absolute bottom-[5%] left-[-10%] w-[600px] h-[600px] rounded-full bg-stitch-secondary-container opacity-10 stitch-ambient-blob"></div>
      
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50">
        <div className="flex justify-between items-center px-8 py-6 w-full max-w-7xl mx-auto">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-slate-900 font-headline">GetLanded</Link>
          <div className="hidden md:flex gap-8 items-center">
            <Link className="text-slate-500 hover:text-cyan-500 transition-colors duration-200 font-manrope text-sm font-medium tracking-tight" to="/">Product</Link>
            <Link className="text-slate-500 hover:text-cyan-500 transition-colors duration-200 font-manrope text-sm font-medium tracking-tight" to="/">Pricing</Link>
            <Link className="text-cyan-500 font-manrope text-sm font-medium tracking-tight" to="/signup">Sign up</Link>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-6 pt-20 pb-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="stitch-glass-card p-10 rounded-[2rem] shadow-[0_12px_40px_rgba(44,47,49,0.06)] border border-white/20">
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-stitch-on-surface mb-3 font-headline">Welcome back</h1>
              <p className="text-stitch-on-surface-variant text-lg leading-relaxed">Please enter your details to sign in.</p>
            </div>

            <form onSubmit={onEmailLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-stitch-on-surface-variant px-1 font-label">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com" 
                  className="w-full px-6 py-4 rounded-xl bg-[rgba(238,241,243,0.5)] border-none focus:ring-2 focus:ring-stitch-primary-container/30 focus:bg-white transition-all duration-200 outline-none text-stitch-on-surface placeholder:text-slate-400" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="block text-xs font-bold uppercase tracking-widest text-stitch-on-surface-variant font-label">Password</label>
                  <a href="#" className="text-xs font-bold uppercase tracking-widest text-stitch-secondary hover:text-stitch-primary transition-colors font-label">Forgot?</a>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••" 
                  className="w-full px-6 py-4 rounded-xl bg-[rgba(238,241,243,0.5)] border-none focus:ring-2 focus:ring-stitch-primary-container/30 focus:bg-white transition-all duration-200 outline-none text-stitch-on-surface placeholder:text-slate-400" 
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
                  {error}
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="stitch-primary-gradient-btn w-full py-4 rounded-xl text-white font-bold text-lg shadow-[0_12px_24px_rgba(0,100,123,0.15)] hover:saturate-150 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:active:scale-100"
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </div>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px flex-grow bg-slate-200"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 font-label">or continue with</span>
              <div className="h-px flex-grow bg-slate-200"></div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4">
              <button 
                type="button"
                onClick={onGoogleLogin}
                disabled={googleLoading}
                className="flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-[rgba(238,241,243,0.5)] hover:bg-[#dfe3e6] transition-colors duration-200 text-stitch-on-surface-variant font-medium text-sm disabled:opacity-70"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                {googleLoading ? "Connecting..." : "Google"}
              </button>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-stitch-on-surface-variant font-medium">
              Don't have an account? 
              <Link to="/signup" className="text-stitch-secondary font-bold hover:underline underline-offset-4 ml-2">Sign up</Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full relative z-10 border-t border-slate-200/50">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-8 w-full max-w-7xl mx-auto gap-6 md:gap-0">
          <div className="text-lg font-bold text-slate-900 font-headline">GetLanded</div>
          <div className="flex gap-8">
            <Link to="/" className="text-slate-400 hover:text-slate-900 transition-opacity font-manrope text-xs uppercase tracking-widest font-label">Privacy Policy</Link>
            <Link to="/" className="text-slate-400 hover:text-slate-900 transition-opacity font-manrope text-xs uppercase tracking-widest font-label">Terms of Service</Link>
            <Link to="/" className="text-slate-400 hover:text-slate-900 transition-opacity font-manrope text-xs uppercase tracking-widest font-label">Help Center</Link>
          </div>
          <div className="text-slate-400 font-manrope text-xs uppercase tracking-widest font-label text-center md:text-right">
            © 2024 GetLanded. Built for the modern professional.
          </div>
        </div>
      </footer>
    </div>
  );
}
