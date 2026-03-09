import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { speakResponse } from "../services/voiceService";

const VoiceContext = createContext();

// Map of voice commands to their actions
const VOICE_COMMANDS = {
  // Navigation
  "show jobs": {
    action: "navigate",
    value: "/user/jobs",
    feedback: "Showing available jobs",
  },
  jobs: {
    action: "navigate",
    value: "/user/jobs",
    feedback: "Showing available jobs",
  },
  "go to jobs": {
    action: "navigate",
    value: "/user/jobs",
    feedback: "Showing available jobs",
  },

  dashboard: {
    action: "navigate",
    value: "/user",
    feedback: "Opening your dashboard",
  },
  "go to dashboard": {
    action: "navigate",
    value: "/user",
    feedback: "Opening your dashboard",
  },
  home: { action: "navigate", value: "/user", feedback: "Going to home" },

  resumes: {
    action: "navigate",
    value: "/user",
    feedback: "Showing your resumes",
  },
  "my resumes": {
    action: "navigate",
    value: "/user",
    feedback: "Showing your resumes",
  },

  matcher: {
    action: "navigate",
    value: "/user/matcher",
    feedback: "Opening job matcher",
  },
  "job matcher": {
    action: "navigate",
    value: "/user/matcher",
    feedback: "Opening job matcher",
  },

  "company dashboard": {
    action: "navigate",
    value: "/company",
    feedback: "Opening company dashboard",
  },
  "post job": {
    action: "navigate",
    value: "/company/post-job",
    feedback: "Opening post job page",
  },
  "manage jobs": {
    action: "navigate",
    value: "/company/manage-jobs",
    feedback: "Opening manage jobs",
  },

  admin: {
    action: "navigate",
    value: "/admin",
    feedback: "Opening admin dashboard",
  },
  "admin dashboard": {
    action: "navigate",
    value: "/admin",
    feedback: "Opening admin dashboard",
  },
  "manage users": {
    action: "navigate",
    value: "/admin/users",
    feedback: "Opening manage users",
  },
  "manage companies": {
    action: "navigate",
    value: "/admin/companies",
    feedback: "Opening manage companies",
  },

  // Actions
  logout: { action: "logout", feedback: "Logging you out" },
  "sign out": { action: "logout", feedback: "Signing you out" },
  exit: { action: "logout", feedback: "Exiting application" },

  apply: {
    action: "click",
    selector: "[data-apply]",
    feedback: "Applying to job",
  },
  "apply job": {
    action: "click",
    selector: "[data-apply]",
    feedback: "Applying to job",
  },
  submit: {
    action: "click",
    selector: "button[type='submit']",
    feedback: "Submitting form",
  },
  save: {
    action: "click",
    selector: "[data-save]",
    feedback: "Saving changes",
  },
  cancel: { action: "click", selector: "[data-cancel]", feedback: "Canceling" },
  delete: { action: "click", selector: "[data-delete]", feedback: "Deleting" },
  edit: { action: "click", selector: "[data-edit]", feedback: "Editing" },
  back: { action: "click", selector: "[data-back]", feedback: "Going back" },

  // Help
  help: {
    action: "help",
    feedback:
      "Here are some commands: show jobs, dashboard, logout, apply job, post job",
  },
  commands: {
    action: "help",
    feedback:
      "Here are some commands: show jobs, dashboard, logout, apply job, post job",
  },
  "what can i say": {
    action: "help",
    feedback:
      "Try saying: show jobs, go to dashboard, apply job, post job, or logout",
  },
};

export const VoiceProvider = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState("");

  const handleVoiceCommand = async (text) => {
    console.log("Voice command recognized:", text);
    setLastCommand(text);

    // Only allow voice for "user" role
    if (user?.role !== "user") {
      speakResponse(
        "Voice control is only available for job seekers. Please use the user dashboard.",
      );
      return;
    }

    // Try exact match first
    let command = VOICE_COMMANDS[text];

    // If no exact match, try partial match
    if (!command) {
      const matchedKey = Object.keys(VOICE_COMMANDS).find(
        (key) => text.includes(key) || key.includes(text.split(" ")[0]),
      );
      command = matchedKey ? VOICE_COMMANDS[matchedKey] : null;
    }

    if (!command) {
      // Try to handle dynamic commands like "search javascript"
      if (text.startsWith("search")) {
        const keyword = text.replace("search", "").trim();
        if (keyword) {
          speakResponse(`Searching for ${keyword}`);
          navigate(`/user/jobs?query=${keyword}`);
          return;
        }
      }

      // Try to click any button with matching text
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        if (btn.textContent.toLowerCase().includes(text)) {
          speakResponse(`Clicking ${btn.textContent}`);
          btn.click();
          return;
        }
      }

      speakResponse(
        "Command not recognized. Say 'help' for available commands",
      );
      return;
    }

    switch (command.action) {
      case "navigate":
        speakResponse(command.feedback);
        navigate(command.value);
        break;

      case "logout":
        speakResponse(command.feedback);
        await logout();
        navigate("/");
        break;

      case "click":
        try {
          const element = document.querySelector(command.selector);
          if (element) {
            speakResponse(command.feedback);
            element.click();
          } else {
            speakResponse("Element not found");
          }
        } catch (e) {
          speakResponse("Could not perform action");
          console.error("Click action error:", e);
        }
        break;

      case "help":
        speakResponse(command.feedback);
        break;

      default:
        speakResponse("Sorry, I could not process that command");
    }
  };

  return (
    <VoiceContext.Provider
      value={{
        handleVoiceCommand,
        isListening,
        setIsListening,
        lastCommand,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);
