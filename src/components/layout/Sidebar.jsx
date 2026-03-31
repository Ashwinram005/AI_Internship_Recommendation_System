import { NavLink } from "react-router-dom";
import { LogOut, BriefcaseBusiness, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useVoice } from "../../context/VoiceContext";
import { startVoiceRecognition } from "../../services/voiceService";
import { Mic } from "lucide-react";
import {
  getProfileDisplayName,
  getProfileInitials,
} from "../../routes/routeUtils";
export default function Sidebar({
  links,
  title,
  roleLabel,
  mobileOpen = false,
  onClose,
}) {
  const { logout, user } = useAuth();
  const { handleVoiceCommand, isListening, setIsListening, lastCommand } =
    useVoice();

  const onVoiceClick = () => {
    startVoiceRecognition(handleVoiceCommand, setIsListening, (error) => {
      console.error("Voice error:", error);
      setIsListening(false);
    });
  };

  const displayName = getProfileDisplayName(user);
  const initials = getProfileInitials(user);

  const closeIfMobile = () => {
    if (typeof onClose === "function") onClose();
  };

  return (
    <aside className={`sidebar-premium ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="lg:hidden flex items-center justify-between px-2 mb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">
          Menu
        </p>
        <button
          onClick={closeIfMobile}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          aria-label="Close sidebar"
        >
          <X size={14} />
        </button>
      </div>
      {/* Brand */}
      <div className="px-2 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0 shadow-lg">
            <BriefcaseBusiness size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 truncate tracking-tight">
              GetLanded
            </p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-1">
        <p className="px-3 text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
          {title}
        </p>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              onClick={closeIfMobile}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Voice control - only for job seekers */}
      {user?.role === "user" && (
        <div className="px-2 my-4 space-y-2">
          <button
            onClick={onVoiceClick}
            disabled={isListening}
            className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-xl font-medium transition-all text-sm shadow-sm ${isListening
                ? "bg-red-50 text-red-600"
                : "stitch-primary-gradient-btn text-white"
              }`}
          >
            <Mic size={18} />
            <span>{isListening ? "Listening..." : "Voice Command"}</span>
          </button>
          {lastCommand && (
            <div className="text-xs text-slate-500 bg-white/40 backdrop-blur-sm p-2.5 rounded-xl">
              <span className="font-medium text-slate-600">Last: </span>
              <span>{lastCommand}</span>
            </div>
          )}
        </div>
      )}

      {/* Logout */}
      <div className="pt-4 mt-4 border-t border-slate-100/50 px-2 space-y-3">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/30 backdrop-blur-md shadow-sm">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover border border-white/50"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-semibold text-indigo-600">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">
              {displayName}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {user?.email || roleLabel}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="nav-link w-full text-slate-400 hover:text-red-500 hover:bg-red-50/50"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
