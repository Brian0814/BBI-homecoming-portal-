/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import { HistoryEntry } from "../types";
import { 
  resolveMailMergeTokens, 
  getAttendeePaymentStats, 
  calculateAttendeeGrandTotal 
} from "../lib/paymentUtils";
import { 
  X, Mail, Send, Copy, Check, Download, Users, 
  ChevronLeft, ChevronRight, Filter, Sparkles, 
  ExternalLink, FileSpreadsheet, AlertCircle, CheckCircle2,
  ListFilter, RefreshCw, Layers, ArrowRight, Play, CheckCheck
} from "lucide-react";

interface MassEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  allAttendees: HistoryEntry[];
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
  allAttendees
}) => {
  // State
  const [selectedPresetId, setSelectedPresetId] = useState<string>("balance_due_milestones");
  const [subjectTemplate, setSubjectTemplate] = useState<string>(TEMPLATE_PRESETS[0].subject);
  const [bodyTemplate, setBodyTemplate] = useState<string>(TEMPLATE_PRESETS[0].body);
  
  // Recipient filtering & selection
  const [filterType, setFilterType] = useState<"all" | "balance_due" | "paid_in_full" | "custom">("balance_due");
  const [searchRecipientQuery, setSearchRecipientQuery] = useState("");
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(() => {
    // Default to balance due attendees on initial preset
    const balanceDueSet = new Set<string>();
    allAttendees.forEach(a => {
      const stats = getAttendeePaymentStats(a);
      if (stats.balanceDue > 0) balanceDueSet.add(a.ref);
    });
    return balanceDueSet.size > 0 ? balanceDueSet : new Set(allAttendees.map(a => a.ref));
  });

  // Previewer
  const [previewIndex, setPreviewIndex] = useState(0);
  const [copiedSingle, setCopiedSingle] = useState(false);
  const [copiedBCC, setCopiedBCC] = useState(false);
  const [copiedAllTranscripts, setCopiedAllTranscripts] = useState(false);

  // Dispatch Queue / Step-through Runner
  const [dispatchStatuses, setDispatchStatuses] = useState<Record<string, "pending" | "opened" | "skipped">>({});
  const [activeDispatchClient, setActiveDispatchClient] = useState<"gmail" | "system">("gmail");

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
      // 'all' and 'custom' show all candidates in selection list

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

  // Handle Preset Change
  const handleSelectPreset = (preset: TemplatePreset) => {
    setSelectedPresetId(preset.id);
    setSubjectTemplate(preset.subject);
    setBodyTemplate(preset.body);
    setFilterType(preset.defaultFilter);

    // Update selected refs to match defaultFilter
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
    
    // Reset focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 50);
  };

  // Safe current recipient
  const currentRecipient: HistoryEntry | undefined = targetRecipients[previewIndex] || targetRecipients[0];

  // Resolved Subject and Body for current preview
  const resolvedPreview = useMemo(() => {
    if (!currentRecipient) return { subject: "", body: "", to: "", stats: null };
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

  // Generate Mail URLs for current recipient
  const { currentGmailUrl, currentMailtoUrl } = useMemo(() => {
    if (!currentRecipient || !resolvedPreview.to) {
      return { currentGmailUrl: "#", currentMailtoUrl: "#" };
    }
    const to = encodeURIComponent(resolvedPreview.to);
    const su = encodeURIComponent(resolvedPreview.subject);
    const body = encodeURIComponent(resolvedPreview.body);
    return {
      currentGmailUrl: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`,
      currentMailtoUrl: `mailto:${to}?subject=${su}&body=${body}`
    };
  }, [currentRecipient, resolvedPreview]);

  // Queue runner: Launch current and advance to next
  const handleLaunchCurrentAndAdvance = () => {
    if (!currentRecipient) return;
    
    // Open email
    const url = activeDispatchClient === "gmail" ? currentGmailUrl : currentMailtoUrl;
    if (url && url !== "#") {
      window.open(url, "_blank");
    }

    // Mark current as opened
    setDispatchStatuses(prev => ({
      ...prev,
      [currentRecipient.ref]: "opened"
    }));

    // Advance index
    if (previewIndex < targetRecipients.length - 1) {
      setPreviewIndex(prev => prev + 1);
    }
  };

  const handleMarkCurrentSkipped = () => {
    if (!currentRecipient) return;
    setDispatchStatuses(prev => ({
      ...prev,
      [currentRecipient.ref]: "skipped"
    }));
    if (previewIndex < targetRecipients.length - 1) {
      setPreviewIndex(prev => prev + 1);
    }
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
      "Recipient_Email",
      "Full_Name",
      "First_Name",
      "Phone",
      "Reference_ID",
      "Selected_Package",
      "TShirt_Size",
      "Jacket_Details",
      "Total_Grand_Cost",
      "Total_Amount_Paid",
      "Remaining_Balance_Due",
      "Payment_Status",
      "Shipping_Address",
      "Special_Requests",
      "Merged_Email_Subject",
      "Merged_Email_Body"
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
      ].map(val => {
        const escaped = String(val ?? "").replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BBI_Homecoming_Mail_Merge_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle recipient selection
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

  const openedCount = Object.values(dispatchStatuses).filter(s => s === "opened").length;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      id="mass-email-merge-modal"
    >
      <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-brand-blue/20 text-brand-blue-light border border-brand-blue/30 rounded-xl">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg sm:text-xl font-black text-white tracking-tight">
                  Mass Email & Mail Merge Hub
                </h3>
                <span className="text-[10px] bg-brand-blue text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Automated Merge
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Dynamically populate and mass dispatch individual personalized homecoming communications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportMailMergeCSV}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Download CSV formatted with pre-merged individual subjects and messages"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Merge CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
          
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
                  2. Target Audience & Recipients
                </span>
                <span className="bg-brand-blue text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {targetRecipients.length} Selected
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
                  Balance Due Only ({allAttendees.filter(a => getAttendeePaymentStats(a).balanceDue > 0).length})
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

            {/* Recipient Toggles & Quick Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchRecipientQuery}
                  onChange={(e) => setSearchRecipientQuery(e.target.value)}
                  placeholder="Search brother or email..."
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
                  title="Copy all target recipient emails as a comma-separated BCC string"
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
                const status = dispatchStatuses[attendee.ref];

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
                        {status === "opened" && (
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded-sm">
                            Drafted
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
                  Supports Merge Tags
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
                  rows={14}
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
                    4. Live Merged Preview
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
                      title="Previous Recipient"
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
                      title="Next Recipient"
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
                  <div className="flex-1 overflow-y-auto max-h-[340px] bg-slate-50 p-4 rounded-lg border border-slate-200 font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {resolvedPreview.body}
                  </div>

                  {/* Quick Actions for Current Brother */}
                  <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-brand-blue flex items-center gap-1">
                        <Send className="w-3.5 h-3.5" />
                        Dispatch for {resolvedPreview.fullName}:
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Ref: {currentRecipient?.ref}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <a
                        href={currentGmailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (currentRecipient) {
                            setDispatchStatuses(prev => ({ ...prev, [currentRecipient.ref]: "opened" }));
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-3xs text-center"
                        title="Open personalized draft directly in Gmail web composer"
                      >
                        <Send className="w-3.5 h-3.5 text-rose-500" />
                        <span>Draft in Gmail</span>
                      </a>

                      <a
                        href={currentMailtoUrl}
                        onClick={() => {
                          if (currentRecipient) {
                            setDispatchStatuses(prev => ({ ...prev, [currentRecipient.ref]: "opened" }));
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-blue-50 text-brand-blue border border-blue-200 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-3xs text-center"
                        title="Open draft in native desktop/mobile email client (Outlook, Apple Mail, etc.)"
                      >
                        <Mail className="w-3.5 h-3.5 text-brand-blue" />
                        <span>System Mail</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleCopySingle}
                        className="flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-3xs"
                        title="Copy rendered message body to clipboard"
                      >
                        {copiedSingle ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy Body</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* Section 4: Automated Sequential Queue Dispatcher Bar */}
          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-brand-blue-light tracking-wider flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-brand-blue" />
                  Rapid Sequential Dispatch Queue
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono border border-slate-700">
                  {openedCount} / {targetRecipients.length} Opened/Drafted
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Quickly step through and open pre-filled emails for all {targetRecipients.length} brothers in sequence without popup blockers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              {/* Preferred Client Selector */}
              <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveDispatchClient("gmail")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    activeDispatchClient === "gmail" ? "bg-rose-600 text-white shadow-2xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Gmail Web
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDispatchClient("system")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    activeDispatchClient === "system" ? "bg-brand-blue text-white shadow-2xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  System Client
                </button>
              </div>

              <button
                type="button"
                onClick={handleMarkCurrentSkipped}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                Skip Current
              </button>

              <button
                type="button"
                disabled={targetRecipients.length === 0}
                onClick={handleLaunchCurrentAndAdvance}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Launch & Next ({previewIndex + 1}/{targetRecipients.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
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
              <span>Download Mail Merge CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
