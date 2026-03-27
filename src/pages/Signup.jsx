import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Lock, Mail, User } from "lucide-react";
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
      // Some security rule configurations block email lookups for non-admin users.
      return null;
    }

    return null;
  };

  const getFriendlySignupError = async (err, fallbackEmail) => {
    if (err.code === "permission-denied" || err.code === "firestore/permission-denied") {
      return "Your account does not have access to this data yet. Update Firestore rules for users, companies, jobs, resumes, and applications.";
    }

    if (err.code === "auth/configuration-not-found") {
      return "Firebase Auth is not fully configured for this project. In Firebase Console, enable Authentication (Email/Password and Google), then restart the app.";
    }

    if (err.code === "auth/unauthorized-domain") {
      return "This domain is not authorized in Firebase Auth. Add localhost to Authentication > Settings > Authorized domains.";
    }

    if (err.code === "auth/email-already-in-use") {
      const existingRole = await detectExistingRoleByEmail(fallbackEmail);
      return `This email is already registered as ${roleLabel(existingRole || "user")}.`;
    }

    if (err.code === "auth/account-exists-with-different-credential") {
      const conflictedEmail = err.customData?.email || fallbackEmail;
      const existingRole = await detectExistingRoleByEmail(conflictedEmail);
      return `This Google account is already linked as ${roleLabel(existingRole || "user")}. Please sign in.`;
    }

    if (err.code === "auth/weak-password") {
      return "Password is too weak. Use at least 8 characters.";
    }

    if (err.code === "auth/network-request-failed") {
      return "Network issue. Please check your internet and retry.";
    }

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
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      if (role === "company") {
        await setDoc(
          doc(db, "companies", uid),
          {
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
          },
          { merge: true },
        );
        await deleteDoc(doc(db, "users", uid));
      } else {
        await setDoc(
          doc(db, "users", uid),
          {
            name,
            email,
            role: "user",
            photoURL: cred.user.photoURL || "",
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
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
      const existingByEmail = finalEmail
        ? await detectExistingRoleByEmail(finalEmail)
        : null;
      const existingRole = existingByUid || existingByEmail;

      if (existingRole) {
        const message = `This Google account is already registered as ${roleLabel(existingRole)}. Please sign in.`;
        sessionStorage.setItem("auth_notice", message);
        await signOut(auth);
        navigate("/login", { replace: true, state: { authNotice: message } });
        return;
      }

      const uid = cred.user.uid;
      const finalName =
        name ||
        cred.user.displayName ||
        (role === "company" ? "Company" : "User");

      if (role === "company") {
        await setDoc(
          doc(db, "companies", uid),
          {
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
          },
          { merge: true },
        );
        await deleteDoc(doc(db, "users", uid));
      } else {
        await setDoc(
          doc(db, "users", uid),
          {
            name: finalName,
            email: finalEmail,
            role: "user",
            photoURL: cred.user.photoURL || "",
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
        await deleteDoc(doc(db, "companies", uid));
      }

      const appUser = await resolveUserProfile(cred.user);
      login(appUser);
      sessionStorage.removeItem("auth_redirect_suppressed");
      navigate(getDefaultRouteByRole(appUser.role), { replace: true });
    } catch (err) {
      sessionStorage.removeItem("auth_redirect_suppressed");
      setError(
        await getFriendlySignupError(err, err.customData?.email || email),
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-100">
      <section className="hidden lg:flex flex-col justify-between p-10 bg-white border-r border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <BriefcaseBusiness size={19} />
          </div>
          <div>
            <p className="font-bold text-slate-900">TalentOps</p>
            <p className="text-xs text-slate-500">
              Professional Hiring Workflows
            </p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-slate-900 leading-tight">
            Build your hiring workspace in minutes.
          </h1>
          <p className="text-slate-600 mt-4">
            Choose candidate or employer mode and continue with structured,
            role-specific workflows.
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Role-aware onboarding and secure access control.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md glass-card p-7 sm:p-8 bg-white">
          <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
          <p className="text-sm text-slate-500 mt-1">
            Set up your platform identity
          </p>

          <form onSubmit={onEmailSignup} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-600">
                Full Name
              </label>
              <div className="relative mt-1.5">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">
                Role
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setRole("user")}
                  className={`saas-btn ${role === "user" ? "saas-btn-primary" : "saas-btn-secondary"}`}
                >
                  Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setRole("company")}
                  className={`saas-btn ${role === "company" ? "saas-btn-primary" : "saas-btn-secondary"}`}
                >
                  Employer
                </button>
              </div>
            </div>

            {role === "company" && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Company Details
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Industry
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
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
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Company Size
                    </label>
                    <select
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
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

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Company Website
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                    placeholder="https://company.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Headquarters
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Short Tagline
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                    placeholder="e.g. Revolutionizing AI Recruting"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
                {error}
              </div>
            )}

            <button
              className="saas-btn saas-btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>

            <button
              type="button"
              onClick={onGoogleSignup}
              className="saas-btn saas-btn-secondary w-full"
              disabled={googleLoading}
            >
              {googleLoading
                ? "Connecting..."
                : `Continue with Google as ${roleLabel(role)}`}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500 text-center">
            Already registered?{" "}
            <Link
              to="/login"
              className="font-semibold text-slate-900 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
