import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bird, Eye, Mail, Lock, User, Building2, Globe, MapPin, Tag } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-[#f8f9fd] flex items-center justify-center p-4 md:p-6 font-body">
      <div className="w-full max-w-5xl h-auto min-h-[650px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col lg:flex-row-reverse">
        
        {/* Left/Right Panel: Onboarding (Blue) */}
        <div className="lg:w-[35%] bg-gradient-to-br from-[#0066ff] to-[#004dc2] p-10 hidden lg:flex flex-col items-center justify-center text-center text-white relative">
          <div className="relative z-10 space-y-6">
            <h1 className="text-4xl font-bold tracking-tight font-headline">Already Here?</h1>
            <p className="text-blue-50/80 text-lg font-medium leading-relaxed max-w-xs mx-auto">
              Sign in and continue your journey with us!
            </p>
            <div className="pt-2">
              <Link 
                to="/login"
                className="inline-block px-10 py-3 border-2 border-white/40 rounded-full font-bold text-base hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                SIGN IN
              </Link>
            </div>
          </div>
          
          {/* Subtle decorative background element */}
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white rounded-full blur-[100px]"></div>
          </div>
        </div>

        {/* Form Panel (White) */}
        <div className="lg:w-[65%] p-6 md:p-10 flex flex-col justify-center bg-white overflow-y-auto max-h-screen lg:max-h-none">
          <div className="w-full max-w-lg mx-auto space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
                  <img src="/logo-main.png" alt="GetLanded Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Join Us!</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight font-headline">Create Account</h2>
              <p className="text-slate-500 text-sm font-medium">
                Choose your role and start your journey today.
              </p>
            </div>

            <form onSubmit={onEmailSignup} className="space-y-4">
              {/* Account Type Toggle */}
              <div className="bg-[#f0f4f8] p-1.5 rounded-full flex gap-1 items-center mb-4">
                <button 
                  type="button"
                  onClick={() => setRole("user")}
                  className={`flex-1 py-2.5 px-4 rounded-full text-xs font-black transition-all ${role === 'user' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Candidate
                </button>
                <button 
                  type="button"
                  onClick={() => setRole("company")}
                  className={`flex-1 py-2.5 px-4 rounded-full text-xs font-black transition-all ${role === 'company' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Employer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative flex items-center group">
                  <User className="absolute left-4 text-slate-400 group-focus-within:text-blue-500" size={16} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder={role === 'company' ? "Company Name" : "Full Name"}
                    className="w-full pl-10 pr-4 py-3.5 bg-[#f0f4f8] border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-slate-700 font-medium text-sm"
                  />
                </div>
                <div className="relative flex items-center group">
                  <Mail className="absolute left-4 text-slate-400 group-focus-within:text-blue-500" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Email Address"
                    className="w-full pl-10 pr-4 py-3.5 bg-[#f0f4f8] border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-slate-700 font-medium text-sm"
                  />
                </div>
              </div>

              <div className="relative flex items-center group">
                <Lock className="absolute left-4 text-slate-400 group-focus-within:text-blue-500" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="w-full pl-10 pr-12 py-3.5 bg-[#f0f4f8] border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-slate-700 font-medium text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  <Eye size={18} />
                </button>
              </div>

              {role === "company" && (
                <div className="space-y-4 pt-4 border-t border-slate-100 mt-2 animate-in fade-in slide-in-from-top-2">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="relative flex items-center group">
                        <Building2 className="absolute left-4 text-slate-400" size={16} />
                        <select
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-[#f0f4f8] border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-slate-700 font-medium appearance-none text-xs"
                        >
                          <option value="">Industry...</option>
                          <option value="Tech">Technology</option>
                          <option value="Finance">Finance</option>
                          <option value="Healthcare">Healthcare</option>
                        </select>
                      </div>
                      <select
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="w-full px-4 py-3 bg-[#f0f4f8] border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-slate-700 font-medium appearance-none text-xs"
                      >
                        <option value="">Size...</option>
                        <option value="1-10">1-10</option>
                        <option value="50+">50+</option>
                      </select>
                   </div>
                   <div className="relative flex items-center group">
                     <Globe className="absolute left-4 text-slate-400" size={16} />
                     <input 
                       type="url"
                       value={website}
                       onChange={(e) => setWebsite(e.target.value)}
                       placeholder="Website URL"
                       className="w-full pl-10 pr-4 py-3 bg-[#f0f4f8] border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-slate-700 font-medium text-sm"
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                    <div className="relative flex items-center group">
                      <MapPin className="absolute left-4 text-slate-400" size={16} />
                      <input 
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Location"
                        className="w-full pl-10 pr-4 py-3 bg-[#f0f4f8] border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-slate-700 font-medium text-sm"
                      />
                    </div>
                    <div className="relative flex items-center group">
                      <Tag className="absolute left-4 text-slate-400" size={16} />
                      <input 
                        type="text"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="Tagline"
                        className="w-full pl-10 pr-4 py-3 bg-[#f0f4f8] border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-slate-700 font-medium text-sm"
                      />
                    </div>
                   </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-2xl text-sm border border-red-100 bg-red-50 text-red-600 font-semibold text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-70 uppercase tracking-wide mt-2"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-extrabold tracking-[0.2em] text-slate-300">
                <span className="bg-white px-4">Or sign up with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onGoogleSignup}
              disabled={googleLoading}
              className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors active:scale-[0.98] disabled:opacity-70 text-xs"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              <span>Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
