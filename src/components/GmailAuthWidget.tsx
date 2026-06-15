import React from "react";
import { User } from "firebase/auth";
import { Mail, ShieldCheck, Link2, LogOut, Loader2 } from "lucide-react";

interface GmailAuthWidgetProps {
  user: User | null;
  accessToken: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isLoading?: boolean;
}

export default function GmailAuthWidget({
  user,
  accessToken,
  onSignIn,
  onSignOut,
  isLoading = false
}: GmailAuthWidgetProps) {
  if (user && accessToken) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-slate-900 border border-slate-800 p-3 sm:px-4 rounded-xl text-xs text-white max-w-xl mx-auto shadow-sm" id="gmail-connected-widget">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={user.photoURL || "https://lh3.googleusercontent.com/a/default-user=s96-c"}
              alt={user.displayName || "Google User"}
              className="w-10 h-10 rounded-full border-2 border-brand-blue-light"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 w-3 h-3 rounded-full border border-slate-900 flex items-center justify-center animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-slate-100">{user.displayName}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-slate-400 font-mono text-[10.5px] truncate max-w-[200px] sm:max-w-xs">{user.email}</p>
            <span className="inline-flex items-center gap-1 text-[9.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wider mt-0.5">
              📧 Gmail Dispatcher: Active (Receipts Auto-Fire)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="ml-auto flex items-center gap-1 text-[10px] uppercase font-black text-slate-400 hover:text-red-400 cursor-pointer p-2 rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-950 transition-all"
          title="Sign out of Google Account"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center max-w-xl mx-auto shadow-sm space-y-3" id="gmail-disconnected-widget">
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <div className="p-2 bg-blue-500/10 text-brand-blue-light rounded-lg border border-brand-blue-light/10">
          <Mail className="w-5 h-5 text-brand-blue-light" />
        </div>
        <div>
          <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">
            Automated Invoice & Reminder Dispatcher
          </h4>
          <p className="text-[10px] text-slate-400 leading-normal max-w-md mx-auto">
            Authorize your Google Account to automatically send beautiful customized transactional receipts to attendees, and dispatch payment alerts directly from your mailbox.
          </p>
        </div>
      </div>

      <div className="flex justify-center pt-1">
        {isLoading ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 bg-slate-850 px-5 py-2.5 rounded-lg text-slate-500 text-xs font-bold border border-slate-800"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Establishing Auth Handshake...</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="gsi-material-button min-h-[40px] cursor-pointer"
            style={{
              background: "white",
              border: "1px solid #dadce0",
              borderRadius: "8px",
              boxSizing: "border-box",
              color: "#3c4043",
              fontFamily: 'Roboto, arial, sans-serif',
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.25px",
              padding: "0 12px",
              position: "relative",
              textAlign: "center",
              verticalAlign: "middle",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center"
            }}
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="gsi-material-button-icon" style={{ display: "flex", width: "18px", height: "18px" }}>
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents" style={{ fontWeight: 600 }}>Link Gmail Account</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
