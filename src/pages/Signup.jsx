import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Lock, Brain, ArrowRight } from "lucide-react";
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

function Signup() {
  const [role, setRole] = useState("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { login, resolveUserProfile } = useAuth();

  const roleLabel = (value) => (value === "company" ? "Employer" : "Job Seeker");

  const detectExistingRoleByUid = async (uid) => {
    const companyDoc = await getDoc(doc(db, "companies", uid));
    if (companyDoc.exists()) return "company";

    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) return userDoc.data().role || "user";

    return null;
  };

  const detectExistingRoleByEmail = async (targetEmail) => {
    const companySnap = await getDocs(
      query(collection(db, "companies"), where("email", "==", targetEmail)),
    );
    if (!companySnap.empty) return "company";

    const usersSnap = await getDocs(
      query(collection(db, "users"), where("email", "==", targetEmail)),
    );
    if (!usersSnap.empty) {
      return usersSnap.docs[0].data().role || "user";
    }

    return null;
  };

  const getFriendlySignupError = async (err, fallbackEmail) => {
    if (err.code === "auth/email-already-in-use") {
      const existingRole = await detectExistingRoleByEmail(fallbackEmail);
      const existingLabel = roleLabel(existingRole || "user");
      return `This email is already registered as ${existingLabel}. Please log in instead.`;
    }

    if (err.code === "auth/account-exists-with-different-credential") {
      const conflictedEmail = err.customData?.email || fallbackEmail;
      const existingRole = await detectExistingRoleByEmail(conflictedEmail);
      const existingLabel = roleLabel(existingRole || "user");
      return `This Google account is already linked to ${conflictedEmail} as ${existingLabel}. Please sign in from the login page.`;
    }

    if (err.code === "auth/weak-password") {
      return "Password is too weak. Use at least 8 characters with letters and numbers.";
    }

    if (err.code === "auth/popup-closed-by-user") {
      return "Google signup was cancelled. Please try again.";
    }

    if (err.code === "auth/popup-blocked") {
      return "Google popup was blocked by the browser. Allow popups and try again.";
    }

    if (err.code === "auth/network-request-failed") {
      return "Network error. Check your internet connection and try again.";
    }
    
    if (err.message?.includes("insufficient permissions")) {
      return "Signup succeeded but profile save failed. Check Firestore security rules.";
    }

    return err.message || "Signup failed. Please try again.";
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length > 0) {
        const existingRole = await detectExistingRoleByEmail(email);
        const existingLabel = roleLabel(existingRole || "user");
        setError(
          `This email is already registered as ${existingLabel}. Please log in instead.`,
        );
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      if (role !== "company") {
        await setDoc(doc(db, "users", userCredential.user.uid), {
          name,
          email,
          role,
          photoURL: userCredential.user.photoURL || "",
          createdAt: serverTimestamp(),
        }, { merge: true });
        // Keep profile source-of-truth in one collection for each role.
        await deleteDoc(doc(db, "companies", userCredential.user.uid));
      }

      if (role === "company") {
        await setDoc(doc(db, "companies", userCredential.user.uid), {
          userId: userCredential.user.uid,
          name,
          email,
          role: "company",
          photoURL: userCredential.user.photoURL || "",
          createdAt: serverTimestamp(),
        }, { merge: true });
        await deleteDoc(doc(db, "users", userCredential.user.uid));
      }

      const appUser = await resolveUserProfile(userCredential.user);
      login(appUser);
      navigate(getDefaultRouteByRole(appUser.role), { replace: true });
    } catch (err) {
      console.error("Signup error:", err);
      const message = await getFriendlySignupError(err, email);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setGoogleLoading(true);
    sessionStorage.setItem("auth_redirect_suppressed", "1");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const userCredential = await signInWithPopup(auth, provider);
      const finalEmail = userCredential.user.email || email;
      const existingRoleByUid = await detectExistingRoleByUid(userCredential.user.uid);
      const existingRoleByEmail = finalEmail
        ? await detectExistingRoleByEmail(finalEmail)
        : null;
      const existingRole = existingRoleByUid || existingRoleByEmail;

      if (existingRole) {
        const message = `This Google account is already registered as ${roleLabel(existingRole)}. Please log in instead.`;
        sessionStorage.setItem("auth_notice", message);
        await signOut(auth);
        navigate("/login", { replace: true, state: { authNotice: message } });
        return;
      }

      const finalName =
        name ||
        userCredential.user.displayName ||
        (role === "company" ? "Company User" : "User");

      if (role === "company") {
        await setDoc(
          doc(db, "companies", userCredential.user.uid),
          {
            userId: userCredential.user.uid,
            name: finalName,
            email: finalEmail,
            role: "company",
            photoURL: userCredential.user.photoURL || "",
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
        await deleteDoc(doc(db, "users", userCredential.user.uid));
      } else {
        await setDoc(
          doc(db, "users", userCredential.user.uid),
          {
            name: finalName,
            email: finalEmail,
            role: "user",
            photoURL: userCredential.user.photoURL || "",
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
        await deleteDoc(doc(db, "companies", userCredential.user.uid));
      }

      const appUser = await resolveUserProfile(userCredential.user);
      login(appUser);
      sessionStorage.removeItem("auth_redirect_suppressed");
      navigate(getDefaultRouteByRole(appUser.role), { replace: true });
    } catch (err) {
      console.error("Google signup error:", err);
      const message = await getFriendlySignupError(
        err,
        err.customData?.email || email,
      );
      setError(message);
      sessionStorage.removeItem("auth_redirect_suppressed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient BG */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-100/60 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
            <Brain size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 font-[Poppins]">
            Create your account
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Get started with AI Resume Analyzer
          </p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm text-slate-900 placeholder-slate-300"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm text-slate-900 placeholder-slate-300"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm text-slate-900 placeholder-slate-300"
                    placeholder="Min. 8 characters"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-600 mb-3">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    value: "user",
                    label: "Job Seeker",
                    desc: "Looking for work",
                  },
                  {
                    value: "company",
                    label: "Employer",
                    desc: "Hiring talent",
                  },
                ].map((r) => (
                  <label
                    key={r.value}
                    className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                      role === r.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                      className="hidden"
                    />
                    <span
                      className={`text-sm font-medium ${role === r.value ? "text-indigo-600" : "text-slate-600"}`}
                    >
                      {r.label}
                    </span>
                    <span className="text-xs text-slate-400 mt-0.5">
                      {r.desc}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="saas-btn saas-btn-primary w-full py-3 rounded-xl text-sm"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">Creating account...</span>
              ) : (
                <span className="flex items-center gap-2">
                  Create account <ArrowRight size={16} />
                </span>
              )}
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              className="saas-btn saas-btn-secondary w-full py-3 rounded-xl text-sm"
            >
              {googleLoading
                ? "Connecting to Google..."
                : role === "company"
                  ? "Continue with Google as Employer"
                  : "Continue with Google as Job Seeker"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
