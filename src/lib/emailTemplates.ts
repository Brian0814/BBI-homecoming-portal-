/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemEmailTemplate, HistoryEntry } from "../types";
import { resolveMailMergeTokens as replaceMergeTokens, sanitizeEmailText } from "./paymentUtils";
import { Firestore, doc, setDoc } from "firebase/firestore";

export const LOCAL_STORAGE_KEY_TEMPLATES = "bbi_homecoming_2026_email_templates";

export const DEFAULT_EMAIL_TEMPLATES: SystemEmailTemplate[] = [
  {
    id: "balance_due_milestones",
    name: "Balance Due & Milestone Installment Schedule",
    category: "Financials",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-200",
    description: "Itemized payment notice with outstanding balance, payments received to-date, milestone due dates, and payment instructions.",
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

If you have any questions or have already submitted a payment that is not reflected above, please reply directly to this email. We look forward to welcoming you home!

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
  • Custom Jacket: {{jacketDetails}}
  • Total Amount Paid: {{grandTotal}}
  • Remaining Balance: $0.00 (PAID IN FULL)

[SHIPPING & FULFILLMENT ADDRESS]
{{shippingAddress}}

All homecoming merchandise and event materials are being prepared for you. Stay tuned for further announcements regarding the schedule of brotherhood events, hospitality suites, and homecoming activities.

Thank you for your leadership and brotherhood. We look forward to welcoming you home!

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

We are excited to share several important updates regarding our upcoming Beta Beta Iota Homecoming Reunion!

[ANNOUNCEMENT HIGHLIGHTS]
  • Homecoming dates and host hotel room block details are officially locked in.
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

[Type your custom message here. You can insert any of the dynamic personalized fields using merge tags.]

Your Current Registration Details:
  • Reference ID: {{ref}}
  • Package: {{packageName}}
  • Amount Paid: {{totalPaid}}
  • Balance Due: {{balanceDue}}

Best regards,
BBI Homecoming Committee`
  }
];

export const EMAIL_MERGE_TOKENS = [
  { tag: "{{firstName}}", label: "First Name", desc: "e.g. Marcus" },
  { tag: "{{fullName}}", label: "Full Name", desc: "e.g. Bro. Marcus Vance" },
  { tag: "{{ref}}", label: "Ref ID", desc: "e.g. BBI-HMC26-XXXX" },
  { tag: "{{balanceDue}}", label: "Balance Due", desc: "e.g. $150" },
  { tag: "{{totalPaid}}", label: "Total Paid", desc: "e.g. $100" },
  { tag: "{{grandTotal}}", label: "Total Cost", desc: "e.g. $250" },
  { tag: "{{statusLabel}}", label: "Status", desc: "e.g. Paid in Full / Balance Due" },
  { tag: "{{packageName}}", label: "Package Name", desc: "e.g. Langston Taylor Alumni Package" },
  { tag: "{{shirtSize}}", label: "Shirt Size", desc: "e.g. Size XL" },
  { tag: "{{jacketDetails}}", label: "Jacket Details", desc: "e.g. Size L, Line Name, Year" },
  { tag: "{{paymentsList}}", label: "Payments List", desc: "Itemized bullet list of payments" },
  { tag: "{{milestonesSchedule}}", label: "Milestones Schedule", desc: "Remaining payment schedule dates" },
  { tag: "{{shippingAddress}}", label: "Shipping Address", desc: "Street, City, State, Zip" },
  { tag: "{{email}}", label: "Email Address", desc: "Attendee email" },
  { tag: "{{phone}}", label: "Phone Number", desc: "Attendee phone" },
  { tag: "{{specialRequests}}", label: "Special Requests", desc: "Attendee dietary/notes" },
];

/**
 * Checks if the given text contains the word "Detroit" (case-insensitive)
 */
export function containsDetroitWord(text: string): boolean {
  if (!text) return false;
  return /\bDetroit\b/i.test(text);
}

/**
 * Loads email templates from local storage, merging with defaults if missing
 */
export function loadEmailTemplatesFromStorage(): SystemEmailTemplate[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_TEMPLATES);
    if (!raw) return DEFAULT_EMAIL_TEMPLATES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_EMAIL_TEMPLATES;

    // Merge with defaults to ensure all required template IDs exist and are sanitized
    const map = new Map<string, SystemEmailTemplate>();
    DEFAULT_EMAIL_TEMPLATES.forEach(d => map.set(d.id, d));
    parsed.forEach((item: SystemEmailTemplate) => {
      if (item && item.id) {
        // Enforce sanitation on load
        map.set(item.id, {
          ...item,
          subject: sanitizeEmailText(item.subject || ""),
          body: sanitizeEmailText(item.body || ""),
        });
      }
    });

    return Array.from(map.values());
  } catch (err) {
    console.warn("Failed to load email templates from localStorage:", err);
    return DEFAULT_EMAIL_TEMPLATES;
  }
}

/**
 * Saves email templates to local storage
 */
export function saveEmailTemplatesToStorage(templates: SystemEmailTemplate[]): void {
  try {
    // Sanitize before saving
    const sanitized = templates.map(t => ({
      ...t,
      subject: sanitizeEmailText(t.subject),
      body: sanitizeEmailText(t.body),
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY_TEMPLATES, JSON.stringify(sanitized));
  } catch (err) {
    console.error("Failed to save email templates to localStorage:", err);
  }
}

/**
 * Persists a single email template to Firestore
 */
export async function saveEmailTemplateToFirestore(db: Firestore, template: SystemEmailTemplate): Promise<void> {
  const sanitized: SystemEmailTemplate = {
    ...template,
    subject: sanitizeEmailText(template.subject),
    body: sanitizeEmailText(template.body),
    updatedAt: new Date().toISOString()
  };

  const docRef = doc(db, "email_templates", template.id);
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Persists all email templates to Firestore
 */
export async function saveAllEmailTemplatesToFirestore(db: Firestore, templates: SystemEmailTemplate[]): Promise<void> {
  for (const t of templates) {
    await saveEmailTemplateToFirestore(db, t);
  }
}

/**
 * Resolves an email template by ID for a specific attendee, returning the populated subject and body.
 */
export function renderSystemEmail(
  templateId: string, 
  attendee: HistoryEntry, 
  customTemplates?: SystemEmailTemplate[]
): { subject: string; body: string } {
  const templates = customTemplates && customTemplates.length > 0 ? customTemplates : loadEmailTemplatesFromStorage();
  const template = templates.find(t => t.id === templateId) || DEFAULT_EMAIL_TEMPLATES.find(t => t.id === templateId) || DEFAULT_EMAIL_TEMPLATES[0];

  const subject = sanitizeEmailText(replaceMergeTokens(template.subject, attendee));
  const body = sanitizeEmailText(replaceMergeTokens(template.body, attendee));

  return { subject, body };
}
