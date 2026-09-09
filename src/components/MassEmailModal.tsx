/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { HistoryEntry, EmailLogEntry } from "../types";
import { 
  resolveMailMergeTokens, 
  getAttendeePaymentStats, 
  calculateAttendeeGrandTotal,
  formatDisplayDate 
} from "../lib/paymentUtils";
import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { 
  X, Mail, Send, Copy, Check, Download, Users, 
  ChevronLeft, ChevronRight, Filter, Sparkles, 
  ExternalLink, FileSpreadsheet, AlertCircle, CheckCircle2,
  ListFilter, RefreshCw, Layers, ArrowRight, Play, Pause,
  CheckCheck, Zap, Clock, ShieldCheck, RotateCcw,
  StopCircle, AlertTriangle, LogOut, Inbox, CheckCircle
} from "lucide-react";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { initAuth, subscribeAuth, googleSignIn, logout, getAccessToken } from "../lib/workspaceAuth";
import { sendEmailViaGmailApi } from "../lib/gmailService";
import { User } from "firebase/auth";

interface MassEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  allAttendees: HistoryEntry[];
  initialSelectedRef?: string;
  onBatchDispatched?: () => void;
}

interface TemplatePreset {
  id: string;
  name: string;
  category: string;
  badgeColor: string;
  description: string;
  defaultFilter: "all" | "balance_due" | "paid_in_full";
  subject: string;
  body: string;
}

interface RecipientDispatchStatus {
  ref: string;
  name: string;
  email: string;
  status: "queued" | "sending" | "sent" | "failed" | "skipped";
  messageId?: string;
  timestamp?: string;
  error?: string;
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "balance_due_milestones",
    name: "Balance Due & Milestone Installment Schedule",
    category: "Financials",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-200",
    description: "Itemized payment notice with outstanding balance, payments received to-date, milestone due dates, and Zelle instructions.",
    defaultFilter: "balance_due",
    subject: "BBI Homecoming 2026: Outstanding Balance & Milestone Schedule ({{fullName}})",
    body: `Dear Brother {{fullName}},

This is a payment update regarding your registration for the BBI Homecoming Reunion 2026.

You currently have a remaining balance of {{balanceDue}} on your registration. Below is your detailed payment status, breakdown of transactions to-date, and the upcoming milestone installment schedule:

[YOUR REGISTRATION DETAILS]
  • Reference ID: {{ref}}
  • Selected Package: {{packageName}}
  • Total Registration Cost: {{grandTotal}}
  • Current Status: {{statusLabel}}

[PAYMENTS RECORDED TO-DATE]
{{paymentsList}}
  • Total Paid: {{totalPaid}}
  • Current Balance Due: {{balanceDue}}

[MILESTONE INSTALLMENT SCHEDULE]
{{milestonesSchedule}}

Please submit payments via Zelle to: bbihomecoming@gmail.com (or coordinate with the Homecoming Committee for alternate arrangements). When submitting, please include your Reference ID ({{ref}}) in the memo.

If you have any questions or have already submitted a payment that is not reflected above, please reply directly to this email. We look forward to welcoming you home to Detroit!

Fraternally & Best regards,
BBI Homecoming Committee`
  },
  {
    id: "paid_in_full_receipt",
    name: "Paid in Full Official Receipt & Confirmation",
    category: "Receipt",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-200",
    description: "Official receipt confirming $0 balance, package merchandise details, and reunion welcome packet info.",
    defaultFilter: "paid_in_full",
    subject: "BBI Homecoming 2026: Official Receipt - PAID IN FULL ({{fullName}})",
    body: `Dear Brother {{fullName}},

Congratulations! This official receipt confirms that your registration for the BBI Homecoming Reunion 2026 is PAID IN FULL!

We have reconciled your account ledger and your balance is $0.00. Thank you for your prompt payments and steadfast commitment to the Beta Beta Iota Chapter.

[OFFICIAL REGISTRATION RECEIPT]
  • Reference ID: {{ref}}
  • Package Selected: {{packageName}}
  • Package T-Shirt Size: {{shirtSize}}
  • Detroit Jacket: {{jacketDetails}}
  • Total Amount Paid: {{grandTotal}}
  • Remaining Balance: $0.00 (PAID IN FULL)

[SHIPPING & FULFILLMENT ADDRESS]
{{shippingAddress}}

All homecoming merchandise and event materials are being prepared for you. Stay tuned for further announcements regarding the schedule of brotherhood events, hospitality suites, and Detroit homecoming activities.

Thank you for your leadership and brotherhood. We look forward to welcoming you home to Detroit!

Fraternally & Best regards,
BBI Homecoming Committee`
  },
  {
    id: "profile_verification",
    name: "Registration & Custom Sizing Verification",
    category: "Coordination",
    badgeColor: "bg-blue-100 text-blue-900 border-blue-200",
    description: "Verifies sizing, custom jacket line embroidery, shipping address, and special committee requests.",
    defaultFilter: "all",
    subject: "BBI Homecoming 2026: Profile & Sizing Verification ({{fullName}})",
    body: `Dear Brother {{fullName}},

As we finalize our manufacturing and production orders for the BBI Homecoming Reunion 2026 commemorative items, please take a moment to review and verify your attendee profile:

[REGISTRANT PROFILE & SIZING]
  • Reference ID: {{ref}}
  • Attendee Name: {{fullName}}
  • Contact Phone: {{phone}}
  • Contact Email: {{email}}
  • Selected Package: {{packageName}}
  • Box T-Shirt Size: {{shirtSize}}
  • Custom Jacket Details: {{jacketDetails}}

[SHIPPING DESTINATION]
{{shippingAddress}}

[SPECIAL REQUESTS / COMMITTEE NOTES]
{{specialRequests}}

[FINANCIAL LEDGER]
  • Total Cost: {{grandTotal}}
  • Total Paid to Date: {{totalPaid}}
  • Outstanding Balance: {{balanceDue}}

If any of your sizing or custom embroidery information needs adjustment, please reply to this email immediately so our fulfillment team can update your record.

Fraternally & Best regards,
BBI Homecoming Committee`
  },
  {
    id: "general_announcement",
    name: "Chapter Announcement & General Update",
    category: "General",
    badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-200",
    description: "General communication with personal merge greeting, registration reference, and custom body text.",
    defaultFilter: "all",
    subject: "BBI Homecoming Reunion 2026: Important Chapter Update & Announcements",
    body: `Dear Brother {{firstName}},

We are excited to share several important updates regarding our upcoming Beta Beta Iota Homecoming Reunion in Detroit!

[ANNOUNCEMENT HIGHLIGHTS]
  • Detroit Homecoming dates and host hotel room block details are officially locked in.
  • Commemorative boxes and custom apparel are entering production.
  • Hospitality suite and brotherhood event schedule will be distributed shortly.

[YOUR REGISTRATION SUMMARY]
  • Reference ID: {{ref}}
  • Selected Package: {{packageName}}
  • Payment Status: {{statusLabel}} (Balance: {{balanceDue}})

Please feel free to reach out to the committee with any questions, or reply directly to this email. Let's make this homecoming our greatest brotherhood gathering yet!

Fraternally,
BBI Homecoming Committee`
  },
  {
    id: "blank_custom",
    name: "Custom Blank Mail Merge Template",
    category: "Custom",
    badgeColor: "bg-slate-100 text-slate-900 border-slate-200",
    description: "Start with a clean slate and compose your custom message using dynamic merge tokens.",
    defaultFilter: "all",
    subject: "BBI Homecoming 2026 Update for {{fullName}} (Ref: {{ref}})",
    body: `Dear Brother {{fullName}},

[Type your custom message here. You can click any of the merge token tags above to insert dynamic personalized fields.]

Your Current Registration Details:
  • Reference ID: {{ref}}
  • Package: {{packageName}}
  • Amount Paid: {{totalPaid}}
  • Balance Due: {{balanceDue}}

Best regards,
BBI Homecoming Committee`
  }
];

const MERGE_TOKENS = [
  { tag: "{{firstName}}", label: "First Name", desc: "e.g. Marcus" },
  { tag: "{{fullName}}", label: "Full Name", desc: "e.g. Bro. Marcus Vance" },
  { tag: "{{ref}}", label: "Ref ID", desc: "e.g. BBI-HMC26-XXXX" },
  { tag: "{{balanceDue}}", label: "Balance Due", desc: "e.g. $150" },
  { tag: "{{totalPaid}}", label: "Total Paid", desc: "e.g. $100" },
  { tag: "{{grandTotal}}", label: "Total Cost", desc: "e.g. $250" },
  { tag: "{{statusLabel}}", label: "Status", desc: "e.g. Paid in Full / Deposit Paid" },
  { tag: "{{packageName}}", label: "Package Name", desc: "e.g. Langston Taylor Alumni Package" },
  { tag: "{{shirtSize}}", label: "Shirt Size", desc: "e.g. Size XL" },
  { tag: "{{jacketDetails}}", label: "Jacket Details", desc: "e.g. Size L, Line Name, Year" },
  { tag: "{{paymentsList}}", label: "Payments List", desc: "Itemized bullet list of payments" },
  { tag: "{{milestonesSchedule}}", label: "Milestones Schedule", desc: "Milestone due dates & status" },
  { tag: "{{shippingAddress}}", label: "Shipping Address", desc: "Full address string" },
  { tag: "{{email}}", label: "Email", desc: "Attendee email" },
  { tag: "{{phone}}", label: "Phone", desc: "Attendee phone" },
  { tag: "{{specialRequests}}", label: "Special Requests", desc: "Attendee committee notes" },
];

export const MassEmailModal: React.FC<MassEmailModalProps> = ({
  isOpen,
  onClose,
  allAttendees,
  initialSelectedRef,
  onBatchDispatched
}) => {
  // Preset & Editor State
  const [selectedPresetId, setSelectedPresetId] = useState<string>("balance_due_milestones");
  const [subjectTemplate, setSubjectTemplate] = useState<string>(TEMPLATE_PRESETS[0].subject);
  const [bodyTemplate, setBodyTemplate] = useState<string>(TEMPLATE_PRESETS[0].body);
  
  // Recipient filtering & selection
  const [filterType, setFilterType] = useState<"all" | "balance_due" | "paid_in_full" | "custom">("balance_due");
  const [searchRecipientQuery, setSearchRecipientQuery] = useState("");
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(() => {
    const balanceDueSet = new Set<string>();
    allAttendees.forEach(a => {
      const stats = getAttendeePaymentStats(a);
      if (stats.balanceDue > 0) balanceDueSet.add(a.ref);
    });
    return balanceDueSet.size > 0 ? balanceDueSet : new Set(allAttendees.map(a => a.ref));
  });

  // Handle initialSelectedRef if provided
  useEffect(() => {
    if (initialSelectedRef && isOpen) {
      setFilterType("custom");
      setSelectedRefIds(new Set([initialSelectedRef]));
    }
  }, [initialSelectedRef, isOpen]);

  // Previewer
  const [previewIndex, setPreviewIndex] = useState(0);
  const [copiedSingle, setCopiedSingle] = useState(false);
  const [copiedBCC, setCopiedBCC] = useState(false);
  const [copiedAllTranscripts, setCopiedAllTranscripts] = useState(false);

  // Google OAuth Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [testEmailStatus, setTestEmailStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [testEmailMsg, setTestEmailMsg] = useState<string>("");
  const [singleSendStatus, setSingleSendStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [singleSendMsg, setSingleSendMsg] = useState<string>("");

  useEffect(() => {
    initAuth();
    const unsub = subscribeAuth((user, token) => {
      setCurrentUser(user);
      setAccessToken(token);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsAuthenticating(true);
      setAuthError(null);
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      console.error("Google Sign-In failed:", err);
      setAuthError(err?.message || "Failed to sign in with Google");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
  };

  // 1-Click Mass Dispatch Runner State
  const [is1ClickRunnerOpen, setIs1ClickRunnerOpen] = useState(false);
  const [batchStatus, setBatchStatus] = useState<"ready" | "in_progress" | "paused" | "completed" | "cancelled">("ready");
  const [batchProgressIndex, setBatchProgressIndex] = useState(0);
  const [dispatchResults, setDispatchResults] = useState<RecipientDispatchStatus[]>([]);
  const [batchStartTime, setBatchStartTime] = useState<number | null>(null);
  const [batchElapsedTime, setBatchElapsedTime] = useState<number>(0);
  const [showManualQueue, setShowManualQueue] = useState<boolean>(false);

  const isPausedRef = useRef<boolean>(false);
  const isCancelledRef = useRef<boolean>(false);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter available attendees based on filterType
  const filteredAttendees = useMemo(() => {
    return allAttendees.filter(attendee => {
      const stats = getAttendeePaymentStats(attendee);
      
      let matchesFilter = true;
      if (filterType === "balance_due") {
        matchesFilter = stats.balanceDue > 0;
      } else if (filterType === "paid_in_full") {
        matchesFilter = stats.balanceDue <= 0.01;
      }

      if (!matchesFilter) return false;

      if (searchRecipientQuery.trim()) {
        const q = searchRecipientQuery.toLowerCase();
        const nameMatch = attendee.formData.fullName.toLowerCase().includes(q);
        const emailMatch = attendee.formData.email.toLowerCase().includes(q);
        const refMatch = attendee.ref.toLowerCase().includes(q);
        return nameMatch || emailMatch || refMatch;
      }

      return true;
    });
  }, [allAttendees, filterType, searchRecipientQuery]);

  // Actual selected recipients who will receive the merged email
  const targetRecipients = useMemo(() => {
    if (filterType === "custom") {
      return allAttendees.filter(a => selectedRefIds.has(a.ref));
    }
    return filteredAttendees;
  }, [allAttendees, filterType, selectedRefIds, filteredAttendees]);

  // Preset Selection Handler
  const handleSelectPreset = (preset: TemplatePreset) => {
    setSelectedPresetId(preset.id);
    setSubjectTemplate(preset.subject);
    setBodyTemplate(preset.body);
    setFilterType(preset.defaultFilter);

    const newSet = new Set<string>();
    allAttendees.forEach(a => {
      const stats = getAttendeePaymentStats(a);
      if (preset.defaultFilter === "balance_due" && stats.balanceDue > 0) {
        newSet.add(a.ref);
      } else if (preset.defaultFilter === "paid_in_full" && stats.balanceDue <= 0.01) {
        newSet.add(a.ref);
      } else if (preset.defaultFilter === "all") {
        newSet.add(a.ref);
      }
    });
    setSelectedRefIds(newSet);
    setPreviewIndex(0);
  };

  // Insert token into textarea
  const handleInsertToken = (token: string) => {
    if (!bodyTextareaRef.current) {
      setBodyTemplate(prev => prev + " " + token);
      return;
    }
    const textarea = bodyTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = bodyTemplate;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newText = before + token + after;
    setBodyTemplate(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 50);
  };

  // Safe current recipient for live preview
  const currentRecipient: HistoryEntry | undefined = targetRecipients[previewIndex] || targetRecipients[0];

  // Resolved Subject and Body for current preview
  const resolvedPreview = useMemo(() => {
    if (!currentRecipient) return { subject: "", body: "", to: "", fullName: "", stats: null };
    const sub = resolveMailMergeTokens(subjectTemplate, currentRecipient);
    const body = resolveMailMergeTokens(bodyTemplate, currentRecipient);
    const stats = getAttendeePaymentStats(currentRecipient);
    return {
      subject: sub,
      body: body,
      to: currentRecipient.formData.email,
      fullName: currentRecipient.formData.fullName,
      stats: stats
    };
  }, [currentRecipient, subjectTemplate, bodyTemplate]);

  // Generate Mail URLs for current preview
  const { currentGmailUrl, currentMailtoUrl, groupBccGmailUrl, groupBccMailtoUrl } = useMemo(() => {
    if (!currentRecipient || !resolvedPreview.to) {
      return { currentGmailUrl: "#", currentMailtoUrl: "#", groupBccGmailUrl: "#", groupBccMailtoUrl: "#" };
    }
    const to = encodeURIComponent(resolvedPreview.to);
    const su = encodeURIComponent(resolvedPreview.subject);
    const body = encodeURIComponent(resolvedPreview.body);

    const bccEmails = targetRecipients.map(r => r.formData.email).filter(Boolean).join(",");
    const encBcc = encodeURIComponent(bccEmails);

    return {
      currentGmailUrl: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`,
      currentMailtoUrl: `mailto:${to}?subject=${su}&body=${body}`,
      groupBccGmailUrl: `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encBcc}&su=${su}&body=${body}`,
      groupBccMailtoUrl: `mailto:?bcc=${encBcc}&subject=${su}&body=${body}`
    };
  }, [currentRecipient, resolvedPreview, targetRecipients]);

  // Timer for batch execution
  useEffect(() => {
    let interval: any = null;
    if (batchStatus === "in_progress" && batchStartTime) {
      interval = setInterval(() => {
        setBatchElapsedTime(Math.floor((Date.now() - batchStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [batchStatus, batchStartTime]);

  // ==========================================
  // ⚡ 1-CLICK MASS EMAIL DISPATCH ENGINE
  // ==========================================
  const handleOpen1ClickRunner = () => {
    if (targetRecipients.length === 0) return;

    // Initialize statuses for all target recipients
    const initialStatuses: RecipientDispatchStatus[] = targetRecipients.map(r => ({
      ref: r.ref,
      name: r.formData.fullName,
      email: r.formData.email,
      status: "queued"
    }));

    setDispatchResults(initialStatuses);
    setBatchProgressIndex(0);
    setBatchStatus("ready");
    setBatchStartTime(null);
    setBatchElapsedTime(0);
    isPausedRef.current = false;
    isCancelledRef.current = false;
    setIs1ClickRunnerOpen(true);
  };

  const handleSendTestToSelf = async () => {
    if (!accessToken || !currentUser?.email) {
      await handleGoogleLogin();
      return;
    }
    try {
      setTestEmailStatus("sending");
      setTestEmailMsg("");
      const resolvedSub = `[TEST INBOX] ${resolvedPreview.subject || "BBI Homecoming 2026"}`;
      const resolvedText = `*** THIS IS A TEST DELIVERY SENT DIRECTLY TO YOUR GMAIL INBOX ***\n\nPreviewing merged attendee: ${resolvedPreview.fullName} (${resolvedPreview.ref})\n\n------------------------------------\n\n${resolvedPreview.body}`;
      
      const res = await sendEmailViaGmailApi(
        accessToken,
        currentUser.email,
        resolvedSub,
        resolvedText,
        currentUser.displayName || "BBI Homecoming Committee",
        currentUser.email
      );

      setTestEmailStatus("sent");
      setTestEmailMsg(`Delivered to ${currentUser.email}! (Msg ID: ${res.messageId.slice(0, 8)}...)`);
      setTimeout(() => setTestEmailStatus("idle"), 6000);
    } catch (err: any) {
      console.error("Test email send failed:", err);
      setTestEmailStatus("failed");
      setTestEmailMsg(err?.message || "Failed to deliver test email. Please check your Gmail connection.");
    }
  };

  const handleSendSingleToRecipient = async (attendee: HistoryEntry) => {
    let token = accessToken;
    if (!token) {
      try {
        setIsAuthenticating(true);
        const cred = await googleSignIn();
        if (cred?.accessToken) {
          token = cred.accessToken;
          setAccessToken(token);
          setCurrentUser(cred.user);
        } else {
          setSingleSendStatus("failed");
          setSingleSendMsg("Please sign in with Google to authorize sending emails.");
          return;
        }
      } catch (authErr: any) {
        setSingleSendStatus("failed");
        setSingleSendMsg(authErr?.message || "Google sign-in required to deliver emails");
        return;
      } finally {
        setIsAuthenticating(false);
      }
    }

    try {
      setSingleSendStatus("sending");
      setSingleSendMsg("");

      const resolvedSub = resolveMailMergeTokens(subjectTemplate, attendee);
      const resolvedText = resolveMailMergeTokens(bodyTemplate, attendee);

      const res = await sendEmailViaGmailApi(
        token,
        attendee.formData.email,
        resolvedSub,
        resolvedText,
        currentUser?.displayName || "BBI Homecoming Committee",
        currentUser?.email || undefined
      );

      // Persist delivery record to Firestore under registrations/{ref}
      const nowIso = new Date().toISOString();
      const currentPreset = TEMPLATE_PRESETS.find(p => p.id === selectedPresetId);
      const templateName = currentPreset?.name || "Personalized Update";

      try {
        const existingHistory = attendee.emailHistory || [];
        const newLogEntry: EmailLogEntry = {
          id: res.messageId,
          sentAt: nowIso,
          templateId: selectedPresetId,
          templateName: templateName,
          subject: resolvedSub,
          recipientEmail: attendee.formData.email,
          status: "sent",
          method: "direct-gmail-api",
          messageId: res.messageId
        };

        await setDoc(
          doc(db, "registrations", attendee.ref),
          {
            lastEmailSentAt: nowIso,
            emailHistory: [...existingHistory, newLogEntry]
          },
          { merge: true }
        );
      } catch (fErr) {
        console.warn("Firestore logging note:", fErr);
      }

      setSingleSendStatus("sent");
      setSingleSendMsg(`Email delivered to ${attendee.formData.email}!`);
      setTimeout(() => setSingleSendStatus("idle"), 5000);
      if (onBatchDispatched) {
        onBatchDispatched();
      }
    } catch (err: any) {
      console.error("Direct single send failed:", err);
      setSingleSendStatus("failed");
      setSingleSendMsg(err?.message || "Failed to dispatch email via Gmail API");
    }
  };

  const handleStart1ClickBatchSend = async () => {
    if (targetRecipients.length === 0) return;

    let token = accessToken;
    if (!token) {
      try {
        setIsAuthenticating(true);
        setAuthError(null);
        const cred = await googleSignIn();
        if (cred?.accessToken) {
          token = cred.accessToken;
          setAccessToken(token);
          setCurrentUser(cred.user);
        } else {
          setAuthError("Google Sign-In was cancelled. Please authorize to start sending.");
          return;
        }
      } catch (authErr: any) {
        console.error("Authentication cancelled or failed:", authErr);
        setAuthError(authErr?.message || "Google authorization is required to send real emails to brothers' inboxes.");
        return;
      } finally {
        setIsAuthenticating(false);
      }
    }

    if (!token) {
      setAuthError("No active Gmail authorization token found. Please sign in with Google.");
      return;
    }

    setBatchStatus("in_progress");
    const startTime = Date.now();
    setBatchStartTime(startTime);
    isPausedRef.current = false;
    isCancelledRef.current = false;

    const currentPreset = TEMPLATE_PRESETS.find(p => p.id === selectedPresetId);
    const templateName = currentPreset?.name || "Personalized Update";

    // Progressive execution: Dispatches each recipient one after another with smooth live animation
    for (let i = batchProgressIndex; i < targetRecipients.length; i++) {
      // Check abort
      if (isCancelledRef.current) {
        setBatchStatus("cancelled");
        break;
      }

      // Check pause
      while (isPausedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (isCancelledRef.current) {
          setBatchStatus("cancelled");
          return;
        }
      }

      const attendee = targetRecipients[i];
      setBatchProgressIndex(i);

      // Update item status to "sending"
      setDispatchResults(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: "sending" } : item
      ));

      // Resolve personalized merge tokens
      const resolvedSub = resolveMailMergeTokens(subjectTemplate, attendee);
      const resolvedText = resolveMailMergeTokens(bodyTemplate, attendee);

      let success = false;
      let messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
      let errorMsg: string | undefined = undefined;

      // Validate email format
      if (!attendee.formData.email || !attendee.formData.email.includes("@")) {
        success = false;
        errorMsg = "Missing or invalid email address";
      } else {
        try {
          // Direct dispatch via Gmail REST API using the user's authorized OAuth access token
          const res = await sendEmailViaGmailApi(
            token,
            attendee.formData.email,
            resolvedSub,
            resolvedText,
            currentUser?.displayName || "BBI Homecoming Committee",
            currentUser?.email || undefined
          );
          messageId = res.messageId;
          success = true;
        } catch (err: any) {
          console.error(`Gmail direct dispatch failed for ${attendee.formData.email}:`, err);
          
          // Try backend proxy fallback with Bearer token
          try {
            const resp = await fetch("/api/email/send-single", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                to: attendee.formData.email,
                recipientName: attendee.formData.fullName,
                subject: resolvedSub,
                bodyText: resolvedText,
                ref: attendee.ref,
                senderName: currentUser?.displayName || "BBI Homecoming Committee",
                senderEmail: currentUser?.email
              })
            });

            if (resp.ok) {
              const data = await resp.json().catch(() => ({}));
              messageId = data.messageId || messageId;
              success = true;
            } else {
              const errBody = await resp.json().catch(() => ({}));
              success = false;
              errorMsg = errBody?.error || err?.message || "Delivery rejected by email service";
            }
          } catch (backendErr: any) {
            success = false;
            errorMsg = err?.message || backendErr?.message || "Network exception during delivery";
          }
        }
      }

      const nowIso = new Date().toISOString();

      // Persist delivery record to Firestore under registrations/{ref}
      try {
        const existingHistory = attendee.emailHistory || [];
        const newLogEntry: EmailLogEntry = {
          id: messageId,
          sentAt: nowIso,
          templateId: selectedPresetId,
          templateName: templateName,
          subject: resolvedSub,
          recipientEmail: attendee.formData.email,
          status: success ? "sent" : "failed",
          method: "direct-gmail-api",
          messageId: messageId,
          ...(errorMsg ? { error: errorMsg } : {})
        };

        await setDoc(
          doc(db, "registrations", attendee.ref),
          {
            lastEmailSentAt: nowIso,
            emailHistory: [...existingHistory, newLogEntry]
          },
          { merge: true }
        );
      } catch (firestoreErr) {
        console.warn("Failed to persist email record to Firestore:", firestoreErr);
      }

      // Update state for this recipient
      setDispatchResults(prev => prev.map((item, idx) => 
        idx === i ? { 
          ...item, 
          status: success ? "sent" : "failed", 
          messageId,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          error: errorMsg 
        } : item
      ));

      // Pacing delay (300ms) for smooth UI feedback and spam prevention
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (!isCancelledRef.current) {
      setBatchProgressIndex(targetRecipients.length);
      setBatchStatus("completed");
      if (onBatchDispatched) {
        onBatchDispatched();
      }
    }
  };

  const handlePauseBatch = () => {
    isPausedRef.current = true;
    setBatchStatus("paused");
  };

  const handleResumeBatch = () => {
    isPausedRef.current = false;
    setBatchStatus("in_progress");
  };

  const handleCancelBatch = () => {
    isCancelledRef.current = true;
    setBatchStatus("cancelled");
  };

  // Export Delivery Audit Log
  const handleDownloadDeliveryReport = () => {
    const headers = ["Reference_ID", "Recipient_Name", "Email", "Delivery_Status", "Timestamp", "Message_ID", "Error"];
    const rows = dispatchResults.map(r => [
      r.ref,
      r.name,
      r.email,
      r.status.toUpperCase(),
      r.timestamp || new Date().toISOString(),
      r.messageId || "N/A",
      r.error || ""
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `BBI_Homecoming_Mass_Email_Delivery_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy single resolved body
  const handleCopySingle = () => {
    if (!resolvedPreview.body) return;
    navigator.clipboard.writeText(resolvedPreview.body).then(() => {
      setCopiedSingle(true);
      setTimeout(() => setCopiedSingle(false), 2500);
    });
  };

  // Copy all BCC emails
  const handleCopyBCC = () => {
    const emails = targetRecipients.map(a => a.formData.email.trim()).filter(Boolean);
    const bccString = emails.join(", ");
    navigator.clipboard.writeText(bccString).then(() => {
      setCopiedBCC(true);
      setTimeout(() => setCopiedBCC(false), 2500);
    });
  };

  // Copy all merged letters transcript
  const handleCopyAllTranscripts = () => {
    const fullTranscript = targetRecipients.map((attendee, idx) => {
      const sub = resolveMailMergeTokens(subjectTemplate, attendee);
      const body = resolveMailMergeTokens(bodyTemplate, attendee);
      return `==================================================
RECIPIENT ${idx + 1} OF ${targetRecipients.length}
TO: ${attendee.formData.fullName} <${attendee.formData.email}>
SUBJECT: ${sub}
==================================================
${body}
`;
    }).join("\n\n");

    navigator.clipboard.writeText(fullTranscript).then(() => {
      setCopiedAllTranscripts(true);
      setTimeout(() => setCopiedAllTranscripts(false), 2500);
    });
  };

  // Universal CSV Export for Mailmeteor / YAMM / Word / Gmail Mail Merge
  const handleExportMailMergeCSV = () => {
    const headers = [
      "Recipient_Email", "Full_Name", "First_Name", "Phone", "Reference_ID",
      "Selected_Package", "TShirt_Size", "Jacket_Details", "Total_Grand_Cost",
      "Total_Amount_Paid", "Remaining_Balance_Due", "Payment_Status",
      "Shipping_Address", "Special_Requests", "Merged_Email_Subject", "Merged_Email_Body"
    ];

    const rows = targetRecipients.map(attendee => {
      const stats = getAttendeePaymentStats(attendee);
      const sub = resolveMailMergeTokens(subjectTemplate, attendee);
      const body = resolveMailMergeTokens(bodyTemplate, attendee);

      const rawName = attendee.formData.fullName || "";
      const cleanedName = rawName.replace(/^(Bro\.|Brother)\s+/i, "").trim();
      const firstName = cleanedName.split(" ")[0] || "Brother";

      const addr = attendee.formData.shippingAddress;
      const addrStr = addr ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}` : "";

      let jacketDetails = "None";
      if (attendee.formData.addDetroitJacket) {
        jacketDetails = `Size ${attendee.formData.jacketSize || "N/A"} - Line: ${attendee.formData.jacketLineName || "N/A"} #${attendee.formData.jacketLineNumber || "N/A"}`;
      }

      return [
        attendee.formData.email,
        attendee.formData.fullName,
        firstName,
        attendee.formData.phone,
        attendee.ref,
        attendee.formData.selectedPackageId,
        attendee.formData.shirtSize || "",
        jacketDetails,
        stats.grandTotal,
        stats.totalPaid,
        stats.balanceDue,
        stats.statusLabel,
        addrStr,
        attendee.formData.specialRequests || "",
        sub,
        body
      ].map(val => `"${String(val ?? "").replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `BBI_Homecoming_Mail_Merge_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recipient selection controls
  const handleToggleRecipient = (ref: string) => {
    setFilterType("custom");
    setSelectedRefIds(prev => {
      const next = new Set(prev);
      if (next.has(ref)) {
        next.delete(ref);
      } else {
        next.add(ref);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setFilterType("custom");
    const next = new Set(selectedRefIds);
    filteredAttendees.forEach(a => next.add(a.ref));
    setSelectedRefIds(next);
  };

  const handleDeselectAll = () => {
    setFilterType("custom");
    setSelectedRefIds(new Set());
  };

  if (!isOpen) return null;

  const successfulSends = dispatchResults.filter(r => r.status === "sent").length;
  const failedSends = dispatchResults.filter(r => r.status === "failed").length;
  const percentComplete = targetRecipients.length > 0
    ? Math.round((batchProgressIndex / targetRecipients.length) * 100)
    : 0;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      id="mass-email-merge-modal"
    >
      <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] relative">
        
        {/* =======================================================================
            MODAL HEADER: Prominently Highlights 1-Click Mass Send
           ======================================================================= */}
        <div className="bg-slate-900 text-white px-5 sm:px-7 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-tr from-brand-blue to-indigo-600 text-white border border-brand-blue/30 rounded-xl shadow-xs">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg sm:text-xl font-black text-white tracking-tight">
                  Mass Email & Mail Merge Hub
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-emerald-400" />
                  1-Click Mass Send Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Personalized mail merge messaging: dispatch directly to all brothers without sending one by one.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* HERO 1-CLICK SEND BUTTON IN HEADER */}
            <button
              type="button"
              disabled={targetRecipients.length === 0}
              onClick={handleOpen1ClickRunner}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer ring-2 ring-emerald-400/30 disabled:opacity-40 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              title="1-Click send personalized mail merge emails to all selected recipients automatically"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>1-Click Send All ({targetRecipients.length})</span>
            </button>

            <button
              type="button"
              onClick={handleExportMailMergeCSV}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Download pre-merged CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Merge CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =======================================================================
            MODAL BODY CONTAINER
           ======================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
          
          {/* GMAIL API AUTHENTICATION & DIRECT INBOX DISPATCH BANNER */}
          <div className={`p-4 rounded-xl border transition-all ${
            accessToken && currentUser 
              ? "bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900 text-white border-emerald-500/40 shadow-sm"
              : "bg-gradient-to-r from-amber-50 to-orange-50/70 border-amber-200 text-slate-800 shadow-xs"
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  accessToken && currentUser 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                    : "bg-amber-100 text-amber-700 border border-amber-200"
                }`}>
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-sm font-black ${accessToken && currentUser ? "text-white" : "text-slate-900"}`}>
                      {accessToken && currentUser ? "Gmail Delivery Active (Direct to Inboxes)" : "Connect Gmail for Real Inbox Delivery"}
                    </h4>
                    {accessToken && currentUser ? (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Authorized: {currentUser.email}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-amber-200/60 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        Google Sign-In Required
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${accessToken && currentUser ? "text-slate-300" : "text-slate-600"}`}>
                    {accessToken && currentUser
                      ? "Emails dispatch directly through your verified Gmail account. Sent letters will appear in your official Gmail Sent folder."
                      : "Authorize sending to deliver personalized letters directly into brothers' inboxes without bounce-backs or mock logs."}
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end flex-wrap">
                {accessToken && currentUser ? (
                  <>
                    <button
                      type="button"
                      disabled={testEmailStatus === "sending"}
                      onClick={handleSendTestToSelf}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      title={`Send a real test email with current merged preview to ${currentUser.email}`}
                    >
                      {testEmailStatus === "sending" ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : testEmailStatus === "sent" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Inbox className="w-3.5 h-3.5 text-indigo-200" />
                      )}
                      <span>
                        {testEmailStatus === "sending" ? "Sending to Inbox..." : "Send Test to My Inbox"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
                      title="Switch or disconnect Google account"
                    >
                      <LogOut className="w-3.5 h-3.5 text-slate-400" />
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <GoogleSignInButton 
                    onClick={handleGoogleLogin} 
                    isLoading={isAuthenticating} 
                    text="Sign in with Google to Deliver" 
                  />
                )}
              </div>
            </div>

            {/* Test or Auth notification messages */}
            {testEmailMsg && (
              <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                testEmailStatus === "sent"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}>
                {testEmailStatus === "sent" ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                <span>{testEmailMsg}</span>
              </div>
            )}
            {authError && (
              <div className="mt-3 p-3 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Authentication notice: {authError}</span>
                </div>
                {(authError.toLowerCase().includes("tab") || authError.toLowerCase().includes("popup") || authError.toLowerCase().includes("window")) && (
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg shrink-0 transition-colors shadow-2xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in New Tab</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Section 1: Template Presets Selector */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                1. Select Communication Preset
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Choose a pre-configured template or customize freely
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {TEMPLATE_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-blue-50/60 border-brand-blue ring-2 ring-brand-blue/20 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-black uppercase border ${preset.badgeColor}`}>
                          {preset.category}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-blue" />}
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-1">
                        {preset.name}
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Audience Filter & Recipient Selection Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand-blue" />
                  2. Target Audience ({targetRecipients.length} Selected)
                </span>
                <span className="bg-brand-blue text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {targetRecipients.length} Brothers
                </span>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setFilterType("balance_due"); setPreviewIndex(0); }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    filterType === "balance_due"
                      ? "bg-amber-100 border-amber-300 text-amber-900 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Balance Due ({allAttendees.filter(a => getAttendeePaymentStats(a).balanceDue > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterType("paid_in_full"); setPreviewIndex(0); }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    filterType === "paid_in_full"
                      ? "bg-emerald-100 border-emerald-300 text-emerald-900 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Paid in Full ({allAttendees.filter(a => getAttendeePaymentStats(a).balanceDue <= 0.01).length})
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterType("all"); setPreviewIndex(0); }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    filterType === "all"
                      ? "bg-blue-100 border-blue-300 text-brand-blue shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All Attendees ({allAttendees.length})
                </button>
              </div>
            </div>

            {/* Recipient Search & Checkbox Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchRecipientQuery}
                  onChange={(e) => setSearchRecipientQuery(e.target.value)}
                  placeholder="Search brother, email, or ref..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-brand-blue"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-[11px] font-bold text-brand-blue hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleCopyBCC}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md border border-slate-200 cursor-pointer transition-all"
                  title="Copy all target recipient emails as comma-separated BCC string"
                >
                  {copiedBCC ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                  <span>{copiedBCC ? "BCC Copied!" : "Copy BCC List"}</span>
                </button>
              </div>
            </div>

            {/* Recipient Checkbox Chips Grid */}
            <div className="max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {filteredAttendees.map((attendee) => {
                const isChecked = filterType === "custom" 
                  ? selectedRefIds.has(attendee.ref)
                  : targetRecipients.some(r => r.ref === attendee.ref);
                const stats = getAttendeePaymentStats(attendee);
                const lastSent = attendee.lastEmailSentAt;

                return (
                  <label
                    key={attendee.ref}
                    className={`flex items-center gap-2 p-1.5 rounded-md border text-xs cursor-pointer select-none transition-all ${
                      isChecked
                        ? "bg-white border-blue-300 shadow-3xs"
                        : "bg-slate-100/60 border-slate-200 text-slate-400 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleRecipient(attendee.ref)}
                      className="rounded-sm text-brand-blue focus:ring-brand-blue h-3.5 w-3.5 border-slate-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-800 text-[11px] truncate">
                          {attendee.formData.fullName}
                        </span>
                        {lastSent && (
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded-sm" title={`Sent on ${new Date(lastSent).toLocaleDateString()}`}>
                            Sent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[9.5px] text-slate-500">
                        <span className="truncate">{attendee.formData.email}</span>
                        <span className={`font-mono font-bold ${stats.balanceDue > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                          ${stats.balanceDue}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 3: Split Studio (Composer Left, Live Rendered Preview Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left Column: Template Editor & Merge Tokens (6 Cols) */}
            <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-brand-blue" />
                  3. Mail Merge Template Editor
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded-md">
                  Dynamic Merge Tags
                </span>
              </div>

              {/* Merge Tokens Inserter Bar */}
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-bold text-slate-600 block">
                  Click any tag below to insert dynamic recipient data:
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                  {MERGE_TOKENS.map((token) => (
                    <button
                      key={token.tag}
                      type="button"
                      onClick={() => handleInsertToken(token.tag)}
                      title={token.desc}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-blue-50 text-brand-blue hover:text-brand-blue-dark border border-slate-200 hover:border-blue-300 rounded-md text-[10.5px] font-mono font-bold cursor-pointer transition-all shadow-3xs"
                    >
                      <span>{token.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-1">
                <label htmlFor="email-subject-template" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Email Subject Line
                </label>
                <input
                  id="email-subject-template"
                  type="text"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  placeholder="e.g. BBI Homecoming 2026: Balance & Schedule for {{fullName}}"
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue font-sans shadow-3xs"
                />
              </div>

              {/* Body Textarea */}
              <div className="space-y-1 flex-1 flex flex-col">
                <label htmlFor="email-body-template" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Email Body Content
                </label>
                <textarea
                  id="email-body-template"
                  ref={bodyTextareaRef}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  rows={13}
                  className="w-full flex-1 text-xs font-mono bg-slate-50/70 border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue leading-relaxed shadow-inner"
                  placeholder="Compose your merged email body here..."
                />
              </div>
            </div>

            {/* Right Column: Live Rendered Recipient Preview (6 Cols) */}
            <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col space-y-3.5">
              
              {/* Recipient Stepper Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    4. Sample Rendered Preview
                  </span>
                  {resolvedPreview.stats && (
                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold border ${resolvedPreview.stats.statusColor}`}>
                      {resolvedPreview.stats.statusLabel} (${resolvedPreview.stats.balanceDue} due)
                    </span>
                  )}
                </div>

                {/* Navigator */}
                {targetRecipients.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={previewIndex === 0}
                      onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                      className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-700"
                      title="Previous Recipient Preview"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-slate-600 px-1">
                      {previewIndex + 1} of {targetRecipients.length}
                    </span>
                    <button
                      type="button"
                      disabled={previewIndex >= targetRecipients.length - 1}
                      onClick={() => setPreviewIndex(prev => Math.min(targetRecipients.length - 1, prev + 1))}
                      className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-700"
                      title="Next Recipient Preview"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {targetRecipients.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                  <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                  <p className="font-bold text-sm text-slate-700">No Recipients Selected</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Please adjust your audience filter or select attendees from the recipient list above.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-3">
                  
                  {/* Recipient Metadata Card */}
                  <div className="bg-slate-100/70 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold uppercase text-[10px]">To:</span>
                      <span className="font-mono font-bold text-slate-800">{resolvedPreview.fullName} &lt;{resolvedPreview.to}&gt;</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-1">
                      <span className="text-slate-500 font-bold uppercase text-[10px]">Subject:</span>
                      <span className="font-bold text-slate-900 truncate pl-2">{resolvedPreview.subject}</span>
                    </div>
                  </div>

                  {/* Rendered Body Preview Box */}
                  <div className="flex-1 overflow-y-auto max-h-[310px] bg-slate-50 p-4 rounded-lg border border-slate-200 font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {resolvedPreview.body}
                  </div>

                  {/* Single Recipient Testing Controls */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Live Testing & Single Dispatch:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleCopySingle}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-3xs cursor-pointer"
                        >
                          {copiedSingle ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          <span>{copiedSingle ? "Copied" : "Copy Body"}</span>
                        </button>

                        <button
                          type="button"
                          disabled={singleSendStatus === "sending"}
                          onClick={() => {
                            const attendee = targetRecipients[previewIndex];
                            if (attendee) handleSendSingleToRecipient(attendee);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-3xs cursor-pointer disabled:opacity-50"
                          title={`Deliver email directly to ${resolvedPreview.to} via Gmail API`}
                        >
                          {singleSendStatus === "sending" ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                          ) : (
                            <Send className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>
                            {singleSendStatus === "sending" ? "Delivering..." : `Send to ${resolvedPreview.fullName.split(" ")[0]}`}
                          </span>
                        </button>

                        <a
                          href={currentGmailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-3xs cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3 text-rose-600" />
                          <span>Draft in Gmail</span>
                        </a>
                      </div>
                    </div>

                    {singleSendMsg && (
                      <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                        singleSendStatus === "sent" 
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}>
                        {singleSendStatus === "sent" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span>{singleSendMsg}</span>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* =======================================================================
              SECTION 4: 1-CLICK MASS DISPATCH HERO ACTION CENTER
             ======================================================================= */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-indigo-900/60 shadow-xl relative overflow-hidden">
            
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                    Automated Batch Dispatch
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    No individual sending required
                  </span>
                </div>
                <h4 className="font-display text-lg sm:text-xl font-black text-white tracking-tight">
                  1-Click Mass Email Mail Merge Messaging
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Send personalized letters with dynamic balances, milestone installment schedules, and receipt data to all 
                  <strong className="text-white font-black"> {targetRecipients.length} selected brothers </strong> 
                  simultaneously with a single click. Delivery status is permanently recorded in the chapter ledger.
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                
                {/* 1-Click Group BCC Alternative */}
                <a
                  href={groupBccGmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 shadow-md transition-all cursor-pointer"
                  title="Open Gmail composer with all selected recipients in BCC for general announcements"
                >
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span>1-Click Group BCC (Gmail)</span>
                </a>

                {/* PRIMARY 1-CLICK MASS SEND BUTTON */}
                <button
                  type="button"
                  disabled={targetRecipients.length === 0}
                  onClick={handleOpen1ClickRunner}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white text-sm font-black rounded-xl shadow-xl hover:shadow-emerald-500/25 transition-all cursor-pointer ring-2 ring-emerald-400/40 disabled:opacity-40 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300 animate-pulse" />
                  <span>⚡ 1-Click Send All ({targetRecipients.length}) Merged Emails</span>
                </button>

              </div>
            </div>

            {/* Optional Manual Step-Through Accordion Toggle */}
            <div className="mt-4 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                All emails include personalized tokens, balance reconciliation, and official chapter sign-off.
              </span>
              <button
                type="button"
                onClick={() => setShowManualQueue(!showManualQueue)}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                {showManualQueue ? "Hide manual step-through" : "Need to review one-by-one? Click here"}
              </button>
            </div>

            {/* Collapsible Manual Step-Through (if an admin explicitly wants manual control) */}
            {showManualQueue && (
              <div className="mt-4 p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">
                    Manual Review Queue: Brother {previewIndex + 1} of {targetRecipients.length} ({resolvedPreview.fullName})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(prev => Math.min(targetRecipients.length - 1, prev + 1))}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-slate-300 font-bold"
                    >
                      Skip to Next
                    </button>
                    <a
                      href={currentGmailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-lg font-bold inline-flex items-center gap-1"
                    >
                      <span>Open Single Draft in Gmail</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* =======================================================================
            MODAL FOOTER
           ======================================================================= */}
        <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>✨ Mail merge replaces all tokens instantly.</span>
            <button
              type="button"
              onClick={handleCopyAllTranscripts}
              className="font-bold text-brand-blue hover:underline cursor-pointer ml-1"
            >
              {copiedAllTranscripts ? "✓ All Letters Copied to Clipboard!" : "Copy Full Merged Batch"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportMailMergeCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs shadow-2xs hover:bg-slate-50 cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Merge CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
            >
              Close Hub
            </button>
          </div>
        </div>

        {/* =======================================================================
            ⚡ 1-CLICK AUTOMATED DISPATCH RUNNER DIALOG (OVERLAY)
           ======================================================================= */}
        {is1ClickRunnerOpen && (
          <div 
            className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
            id="1-click-batch-runner"
          >
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Runner Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
                    <Zap className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-black text-white">
                      1-Click Mass Dispatch Runner
                    </h3>
                    <p className="text-xs text-slate-400">
                      Automated personalized delivery for {targetRecipients.length} attendees
                    </p>
                  </div>
                </div>

                {batchStatus !== "in_progress" && (
                  <button
                    type="button"
                    onClick={() => setIs1ClickRunnerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Runner Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
                
                {/* PRE-FLIGHT READY STATE */}
                {batchStatus === "ready" && (
                  <div className="space-y-4">
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs space-y-2 text-slate-700">
                      <div className="flex items-center justify-between font-bold text-slate-900 border-b border-blue-200/60 pb-2">
                        <span>Pre-Flight Dispatch Checklist</span>
                        <span className={`font-mono ${accessToken && currentUser ? "text-emerald-700" : "text-amber-700"}`}>
                          {accessToken && currentUser ? "100% Ready (Gmail Authorized)" : "Sign-In Required"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10.5px]">Selected Recipients:</span>
                          <span className="font-bold text-slate-900">{targetRecipients.length} Brothers</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10.5px]">Active Template:</span>
                          <span className="font-bold text-slate-900 truncate block">
                            {TEMPLATE_PRESETS.find(p => p.id === selectedPresetId)?.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10.5px]">Sender Identity:</span>
                          <span className="font-bold text-slate-900 truncate block">
                            {currentUser ? currentUser.email : "BBI Homecoming Committee"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10.5px]">Delivery Engine:</span>
                          <span className={`font-bold ${accessToken && currentUser ? "text-emerald-700" : "text-amber-700"}`}>
                            {accessToken && currentUser ? "Official Gmail REST API" : "Awaiting Google Sign-In"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold uppercase text-slate-600 block">
                        Sample Subject Preview:
                      </span>
                      <p className="text-xs font-mono font-bold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        {resolvedPreview.subject || "BBI Homecoming Reunion 2026"}
                      </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        Clicking <strong>"Start 1-Click Mass Send"</strong> will sequentially merge and dispatch all {targetRecipients.length} emails without requiring individual confirmation for each brother. You can pause or cancel at any time.
                      </p>
                    </div>
                  </div>
                )}

                {/* IN PROGRESS OR PAUSED STATE */}
                {(batchStatus === "in_progress" || batchStatus === "paused") && (
                  <div className="space-y-4">
                    
                    {/* Live Progress Card */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold uppercase text-slate-700 tracking-wide flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${batchStatus === "in_progress" ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`} />
                          {batchStatus === "in_progress" ? "Dispatching Personalized Batch..." : "Batch Paused"}
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {batchProgressIndex} / {targetRecipients.length} ({percentComplete}%)
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-gradient-to-r from-brand-blue via-indigo-600 to-emerald-500 transition-all duration-300 ease-out"
                          style={{ width: `${percentComplete}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                        <span>Elapsed: {batchElapsedTime}s</span>
                        <span>Delivered: {successfulSends} • Failed: {failedSends}</span>
                      </div>
                    </div>

                    {/* Progress Controls */}
                    <div className="flex items-center justify-center gap-3 pt-1">
                      {batchStatus === "in_progress" ? (
                        <button
                          type="button"
                          onClick={handlePauseBatch}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause Dispatch</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResumeBatch}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Resume Dispatch</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleCancelBatch}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition-all"
                      >
                        <StopCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Stop / Cancel</span>
                      </button>
                    </div>

                  </div>
                )}

                {/* COMPLETED STATE */}
                {batchStatus === "completed" && (
                  <div className="space-y-4 text-center py-2 animate-in zoom-in-95">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-md">
                      <CheckCheck className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-display text-xl font-black text-slate-900">
                        1-Click Mass Dispatch Complete!
                      </h4>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        All {successfulSends} personalized emails were successfully dispatched and permanently logged in the chapter ledger.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sent</span>
                        <span className="text-lg font-black text-emerald-600 font-mono">{successfulSends}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Failed</span>
                        <span className="text-lg font-black text-slate-700 font-mono">{failedSends}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Time</span>
                        <span className="text-lg font-black text-indigo-600 font-mono">{batchElapsedTime}s</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* CANCELLED STATE */}
                {batchStatus === "cancelled" && (
                  <div className="space-y-2 text-center py-4 text-slate-600">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                    <h4 className="font-bold text-sm text-slate-800">Dispatch Cancelled</h4>
                    <p className="text-xs text-slate-500">
                      Dispatched {successfulSends} of {targetRecipients.length} before being stopped.
                    </p>
                  </div>
                )}

                {/* LIVE RECIPIENT DISPATCH FEED (Always visible during/after run) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                    <span>Live Recipient Delivery Feed:</span>
                    <span className="text-slate-400">{dispatchResults.length} Brothers</span>
                  </div>

                  <div className="max-h-52 overflow-y-auto bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-inner">
                    {dispatchResults.map((rec) => (
                      <div key={rec.ref} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate text-[11.5px]">
                              {rec.name}
                            </span>
                            <span className="text-[9.5px] font-mono text-slate-400">
                              ({rec.ref})
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {rec.email}
                          </span>
                        </div>

                        <div>
                          {rec.status === "queued" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-500">
                              Queued
                            </span>
                          )}
                          {rec.status === "sending" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-brand-blue flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-brand-blue animate-spin" />
                              Sending...
                            </span>
                          )}
                          {rec.status === "sent" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Delivered {rec.timestamp ? `(${rec.timestamp})` : ""}
                            </span>
                          )}
                          {rec.status === "failed" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
                              Failed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Runner Footer */}
              <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                {batchStatus === "ready" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIs1ClickRunnerOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel & Return
                    </button>

                    {!accessToken ? (
                      <GoogleSignInButton
                        onClick={handleGoogleLogin}
                        isLoading={isAuthenticating}
                        text={`Authorize Gmail & Send All (${targetRecipients.length})`}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={handleStart1ClickBatchSend}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg cursor-pointer transition-all transform hover:-translate-y-0.5"
                      >
                        <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span>Start 1-Click Mass Send Now ({targetRecipients.length})</span>
                      </button>
                    )}
                  </>
                ) : batchStatus === "completed" || batchStatus === "cancelled" ? (
                  <div className="flex flex-wrap items-center justify-between w-full gap-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadDeliveryReport}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Download Delivery Report (.CSV)</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {failedSends > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            // Filter target recipients to only those that failed
                            const failedRefs = new Set(dispatchResults.filter(r => r.status === "failed").map(r => r.ref));
                            const failedAttendees = targetRecipients.filter(a => failedRefs.has(a.ref));
                            if (failedAttendees.length > 0) {
                              setDispatchResults(failedAttendees.map(a => ({
                                ref: a.ref,
                                name: a.formData.fullName,
                                email: a.formData.email,
                                status: "queued"
                              })));
                              setBatchStatus("ready");
                              setBatchProgressIndex(0);
                            }
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black cursor-pointer shadow-md flex items-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Retry Failed Dispatches ({failedSends})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIs1ClickRunnerOpen(false);
                          onClose();
                        }}
                        className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer shadow-md"
                      >
                        Done & Return to Portal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full text-center text-xs text-slate-500 italic">
                    Dispatch in progress. Please keep this window open while messages are delivered.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
