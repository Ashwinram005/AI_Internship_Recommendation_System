import { NavLink } from "react-router-dom";
import { LogOut, Brain } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useVoice } from "../../context/VoiceContext";
import { startVoiceRecognition } from "../../services/voiceService";
import { Mic } from "lucide-react";
import { getProfileDisplayName, getProfileInitials } from "../../routes/routeUtils";

export default function Sidebar({ links, title, roleLabel }) {
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

  return (
    <aside className="sidebar-premium">
      {/* Brand */}
      <div className="px-2 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
            <Brain size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900 truncate font-[Poppins]">
              AI Resume
            </p>
            <p className="text-xs text-slate-400">{roleLabel}</p>
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
            className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-xl font-medium transition-all text-sm ${
              isListening
                ? "bg-red-50 text-red-500 border border-red-200"
                : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            }`}
          >
            <Mic size={18} />
            <span>{isListening ? "Listening..." : "Voice Command"}</span>
          </button>
          {lastCommand && (
            <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="font-medium text-slate-600">Last: </span>
              <span>{lastCommand}</span>
            </div>
          )}
        </div>
      )}

      {/* Logout */}
      <div className="pt-4 mt-4 border-t border-slate-200 px-2 space-y-3">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-semibold text-indigo-600">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{displayName}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email || roleLabel}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="nav-link w-full text-slate-400 hover:text-red-500 hover:bg-red-50"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
