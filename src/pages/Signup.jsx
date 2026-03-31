import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Lock, Mail, User, Building2, Globe, MapPin, Tag } from "lucide-react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { getDefaultRouteByRole } from "../routes/routeUtils";

export default function Signup() {
  const navigate = useNavigate();
  const { login, resolveUserProfile } = useAuth();

  const [role, setRole] = useState("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // New Company Fields
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [location, setLocation] = useState("");
  const [tagline, setTagline] = useState("");

  const roleLabel = (value) => (value === "company" ? "Employer" : "Candidate");

  const detectExistingRoleByUid = async (uid) => {
    const companyDoc = await getDoc(doc(db, "companies", uid));
    if (companyDoc.exists()) return "company";

    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) return userDoc.data().role || "user";

    return null;
  };

  const detectExistingRoleByEmail = async (targetEmail) => {
    try {
      const companySnap = await getDocs(
        query(collection(db, "companies"), where("email", "==", targetEmail)),
      );
      if (!companySnap.empty) return "company";

      const usersSnap = await getDocs(
        query(collection(db, "users"), where("email", "==", targetEmail)),
      );
      if (!usersSnap.empty) return usersSnap.docs[0].data().role || "user";
    } catch {
      return null;
    }
    return null;
  };

  const getFriendlySignupError = async (err, fallbackEmail) => {
    if (err.code === "permission-denied" || err.code === "firestore/permission-denied") {
      return "Your account does not have access to this data yet. Update Firestore rules.";
    }
    if (err.code === "auth/configuration-not-found") return "Firebase Auth is not fully configured.";
    if (err.code === "auth/unauthorized-domain") return "This domain is not authorized in Firebase Auth.";
    if (err.code === "auth/email-already-in-use") {
      const existingRole = await detectExistingRoleByEmail(fallbackEmail);
      return `This email is already registered as ${roleLabel(existingRole || "user")}.`;
    }
    if (err.code === "auth/account-exists-with-different-credential") {
      const conflictedEmail = err.customData?.email || fallbackEmail;
      const existingRole = await detectExistingRoleByEmail(conflictedEmail);
      return `This Google account is already linked as ${roleLabel(existingRole || "user")}. Please sign in.`;
    }
    if (err.code === "auth/weak-password") return "Password is too weak. Use at least 8 characters.";
    return err.message || "Signup failed.";
  };

  const onEmailSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        setError("This email is already registered. Please sign in instead.");
        setLoading(false);
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      if (role === "company") {
        await setDoc(doc(db, "companies", uid), {
          userId: uid,
          name,
          email,
          role: "company",
          photoURL: cred.user.photoURL || "",
          website,
          industry,
          companySize,
          location,
          tagline,
          createdAt: serverTimestamp(),
        }, { merge: true });
        await deleteDoc(doc(db, "users", uid));
      } else {
        await setDoc(doc(db, "users", uid), {
          name,
          email,
          role: "user",
          photoURL: cred.user.photoURL || "",
          createdAt: serverTimestamp(),
        }, { merge: true });
        await deleteDoc(doc(db, "companies", uid));
      }

      const appUser = await resolveUserProfile(cred.user);
      login(appUser);
      navigate(getDefaultRouteByRole(appUser.role), { replace: true });
    } catch (err) {
      setError(await getFriendlySignupError(err, email));
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSignup = async () => {
    setGoogleLoading(true);
    setError("");
    sessionStorage.setItem("auth_redirect_suppressed", "1");

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      const finalEmail = cred.user.email || email;

      const existingByUid = await detectExistingRoleByUid(cred.user.uid);
      const existingByEmail = finalEmail ? await detectExistingRoleByEmail(finalEmail) : null;
      const existingRole = existingByUid || existingByEmail;

      if (existingRole) {
        const message = `This Google account is already registered as ${roleLabel(existingRole)}. Please sign in.`;
        sessionStorage.setItem("auth_notice", message);
        await signOut(auth);
        navigate("/login", { replace: true, state: { authNotice: message } });
        return;
      }

      const uid = cred.user.uid;
      const finalName = name || cred.user.displayName || (role === "company" ? "Company" : "User");

      if (role === "company") {
        await setDoc(doc(db, "companies", uid), {
          userId: uid,
          name: finalName,
          email: finalEmail,
          role: "company",
          photoURL: cred.user.photoURL || "",
          website,
          industry,
          companySize,
          location,
          tagline,
          createdAt: serverTimestamp(),
        }, { merge: true });
        await deleteDoc(doc(db, "users", uid));
      } else {
        await setDoc(doc(db, "users", uid), {
          name: finalName,
          email: finalEmail,
          role: "user",
          photoURL: cred.user.photoURL || "",
          createdAt: serverTimestamp(),
        }, { merge: true });
        await deleteDoc(doc(db, "companies", uid));
      }

      const appUser = await resolveUserProfile(cred.user);
      login(appUser);
      sessionStorage.removeItem("auth_redirect_suppressed");
      navigate(getDefaultRouteByRole(appUser.role), { replace: true });
    } catch (err) {
      sessionStorage.removeItem("auth_redirect_suppressed");
      setError(await getFriendlySignupError(err, err.customData?.email || email));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-stitch-background text-stitch-on-surface min-h-screen relative overflow-x-hidden selection:bg-stitch-primary-container selection:text-stitch-on-primary-container font-body">
      {/* Ambient Gradient Blobs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-stitch-primary-container opacity-10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-1/2 -left-48 w-[500px] h-[500px] bg-stitch-secondary-container opacity-10 rounded-full blur-[120px] pointer-events-none"></div>

      <header className="fixed top-0 w-full z-50 px-4 md:px-8 py-4 md:py-6 bg-white/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-extrabold tracking-tighter text-stitch-on-surface font-headline">
            GetLanded
          </Link>
          <a className="text-sm font-semibold text-stitch-on-surface-variant hover:text-stitch-primary transition-colors" href="#">
            Support
          </a>
        </div>
      </header>

      <main className="min-h-screen flex items-center justify-center px-6 pt-32 pb-24 relative z-10">
        <div className="w-full max-w-md">
          {/* Auth Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-stitch-on-surface mb-3 font-headline">
              Create your account
            </h1>
            <p className="text-stitch-on-surface-variant font-medium">
              Join the future of professional landing.
            </p>
          </div>

          {/* Signup Card */}
          <div className="stitch-glass-card rounded-[1rem] p-8 shadow-[0_12px_40px_rgba(44,47,49,0.06)] border border-white/20">
            <form onSubmit={onEmailSignup} className="space-y-6">
              {/* Account Type Toggle */}
              <div className="bg-[rgba(238,241,243,0.7)] p-1.5 rounded-full flex gap-1 items-center">
                <button 
                  type="button"
                  onClick={() => setRole("user")}
                  className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all ${role === "user" ? "stitch-primary-gradient-btn text-white shadow-lg" : "text-stitch-on-surface-variant hover:text-stitch-on-surface"}`}
                >
                  Candidate
                </button>
                <button 
                  type="button"
                  onClick={() => setRole("company")}
                  className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all ${role === "company" ? "stitch-primary-gradient-btn text-white shadow-lg" : "text-stitch-on-surface-variant hover:text-stitch-on-surface"}`}
                >
                  Employer
                </button>
              </div>

              {/* Input Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[0.75rem] uppercase tracking-wider font-bold text-stitch-on-surface-variant ml-1 font-label">Full Name</label>
                  <div className="bg-[rgba(238,241,243,0.5)] rounded-xl flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-stitch-primary/30 focus-within:bg-white">
                    <User size={18} className="text-stitch-outline-variant mr-3" />
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-transparent border-none focus:ring-0 py-3.5 text-stitch-on-surface placeholder:text-slate-400 font-medium outline-none" 
                      placeholder={role === 'company' ? "Company Name" : "John Doe"} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[0.75rem] uppercase tracking-wider font-bold text-stitch-on-surface-variant ml-1 font-label">Email</label>
                  <div className="bg-[rgba(238,241,243,0.5)] rounded-xl flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-stitch-primary/30 focus-within:bg-white">
                    <Mail size={18} className="text-stitch-outline-variant mr-3" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-transparent border-none focus:ring-0 py-3.5 text-stitch-on-surface placeholder:text-slate-400 font-medium outline-none" 
                      placeholder="name@company.com" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[0.75rem] uppercase tracking-wider font-bold text-stitch-on-surface-variant ml-1 font-label">Password</label>
                  <div className="bg-[rgba(238,241,243,0.5)] rounded-xl flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-stitch-primary/30 focus-within:bg-white">
                    <Lock size={18} className="text-stitch-outline-variant mr-3" />
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-transparent border-none focus:ring-0 py-3.5 text-stitch-on-surface placeholder:text-slate-400 font-medium outline-none" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>

                {role === "company" && (
                  <div className="space-y-4 pt-4 border-t border-slate-200/50 mt-4">
                    <p className="text-xs font-bold text-stitch-outline-variant uppercase tracking-widest text-center font-label">
                      Company Details
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[0.75rem] uppercase tracking-wider font-bold text-stitch-on-surface-variant ml-1 font-label">Industry</label>
                        <select
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full bg-[rgba(238,241,243,0.5)] border-none rounded-xl focus:ring-2 focus:ring-stitch-primary/30 focus:bg-white py-3.5 px-4 text-stitch-on-surface font-medium outline-none text-sm appearance-none"
                        >
                          <option value="">Select...</option>
                          <option value="Tech">Technology</option>
                          <option value="Finance">Finance</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Education">Education</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1.5">
                         <label className="block text-[0.75rem] uppercase tracking-wider font-bold text-stitch-on-surface-variant ml-1 font-label">Size</label>
                         <select
                          value={companySize}
                          onChange={(e) => setCompanySize(e.target.value)}
                          className="w-full bg-[rgba(238,241,243,0.5)] border-none rounded-xl focus:ring-2 focus:ring-stitch-primary/30 focus:bg-white py-3.5 px-4 text-stitch-on-surface font-medium outline-none text-sm appearance-none"
                        >
                          <option value="">Select...</option>
                          <option value="1-10">1-10</option>
                          <option value="11-50">11-50</option>
                          <option value="51-200">51-200</option>
                          <option value="201-500">201-500</option>
                          <option value="500+">500+</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[0.75rem] uppercase tracking-wider font-bold text-stitch-on-surface-variant ml-1 font-label">Website</label>
                      <div className="bg-[rgba(238,241,243,0.5)] rounded-xl flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-stitch-primary/30 focus-within:bg-white">
                        <Globe size={18} className="text-stitch-outline-variant mr-3" />
                        <input 
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 py-3.5 text-stitch-on-surface placeholder:text-slate-400 font-medium outline-none text-sm" 
                          placeholder="https://company.com" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[0.75rem] uppercase tracking-wider font-bold text-stitch-on-surface-variant ml-1 font-label">Location</label>
                      <div className="bg-[rgba(238,241,243,0.5)] rounded-xl flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-stitch-primary/30 focus-within:bg-white">
                        <MapPin size={18} className="text-stitch-outline-variant mr-3" />
                        <input 
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 py-3.5 text-stitch-on-surface placeholder:text-slate-400 font-medium outline-none text-sm" 
                          placeholder="San Francisco, CA" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[0.75rem] uppercase tracking-wider font-bold text-stitch-on-surface-variant ml-1 font-label">Tagline</label>
                      <div className="bg-[rgba(238,241,243,0.5)] rounded-xl flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-stitch-primary/30 focus-within:bg-white">
                        <Tag size={18} className="text-stitch-outline-variant mr-3" />
                        <input 
                          type="text"
                          value={tagline}
                          onChange={(e) => setTagline(e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 py-3.5 text-stitch-on-surface placeholder:text-slate-400 font-medium outline-none text-sm" 
                          placeholder="Revolutionizing AI..." 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-xl text-sm border border-red-200 bg-red-50 text-red-700 text-center font-medium">
                  {error}
                </div>
              )}

              {/* Terms */}
              <p className="text-[0.7rem] text-stitch-on-surface-variant leading-relaxed text-center px-4 mt-2">
                By signing up, you agree to our <a href="#" className="text-stitch-primary font-semibold hover:underline decoration-stitch-primary/30">Terms of Service</a> and <a href="#" className="text-stitch-primary font-semibold hover:underline decoration-stitch-primary/30">Privacy Policy</a>.
              </p>

              {/* CTA */}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full stitch-primary-gradient-btn text-white py-4 rounded-xl font-bold tracking-tight shadow-[0_12px_40px_rgba(0,100,123,0.15)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8 flex items-center justify-center">
              <div className="w-full border-t border-slate-200"></div>
              <span className="absolute bg-white px-4 text-[0.65rem] uppercase tracking-[0.1em] font-extrabold text-stitch-outline-variant">OR</span>
            </div>

            {/* Social Signups */}
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={onGoogleSignup}
                disabled={googleLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[rgba(238,241,243,0.5)] rounded-xl hover:bg-[#dfe3e6] transition-colors text-sm font-bold text-stitch-on-surface-variant disabled:opacity-70"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                {googleLoading ? "Connecting..." : "Google"}
              </button>
            </div>

            <div className="text-center mt-8">
              <p className="text-stitch-on-surface-variant font-medium text-sm">
                Already have an account? 
                <Link to="/login" className="text-stitch-primary font-bold hover:underline decoration-stitch-primary/30 underline-offset-4 ml-1">Log in</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Visual Element: Floating Abstract Image */}
      <div className="fixed bottom-12 right-12 hidden lg:block w-72 h-72 pointer-events-none z-0">
        <div className="relative w-full h-full">
          <div className="absolute inset-0 bg-stitch-primary-container/20 rounded-full animate-pulse blur-3xl"></div>
          <img alt="Modern Abstract Concept" className="w-full h-full object-cover rounded-[2rem] shadow-2xl relative z-10 border border-white/40 opacity-90" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnXksYcpmu694nNNlS0x8BuCheIJYMjPRuuBjaJkdouEsQvQXWXbFMX_djHp4_7ltBB36sWuPpwHoL44lFEF8g9HI3HRD2caKsBLVbpD0QWWpQ2urMMLy4ve8WOYKmpxRpq0NYf9fc5wXHHWrI6Kh2aXvaqHVmS8HbUfUtzGyRwUeAudhKtStaQ4vBDLF37iyAQqv6oB4YnzkOmzXPCtauPjQMxmJ-dM2BVjh1Ia33zTgnEo8SkuYKk4WetL5vobT2YW8-65rFAKg"/>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-slate-200/50 bg-[#f5f7f9] relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 max-w-7xl mx-auto">
          <p className="text-xs font-manrope tracking-wide text-slate-400">© 2024 GetLanded AI. All rights reserved.</p>
          <div className="flex gap-8 mt-6 md:mt-0">
            <Link to="/" className="text-xs font-manrope tracking-wide text-slate-400 hover:text-cyan-500 hover:underline decoration-cyan-500/30 underline-offset-4 transition-all duration-200">Privacy Policy</Link>
            <Link to="/" className="text-xs font-manrope tracking-wide text-slate-400 hover:text-cyan-500 hover:underline decoration-cyan-500/30 underline-offset-4 transition-all duration-200">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
