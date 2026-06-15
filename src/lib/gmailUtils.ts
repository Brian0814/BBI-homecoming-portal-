import { OrderForm, PACKAGE_OPTIONS } from "../types";
import { getPaymentMilestones } from "./paymentUtils";

// Robust UTF-8 Base64URL-encoding helper
function base64url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = "";
  utf8Bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Dispatches a raw MIME email message via the authenticated Google user's Gmail API.
 */
export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  htmlContent: string
): Promise<any> {
  const mimeMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    htmlContent
  ].join("\r\n");

  const raw = base64url(mimeMessage);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gmail API error (status ${response.status})`);
  }

  return response.json();
}

/**
 * Generates a polished HTML email layout for the Instant Order Confirmation.
 */
export function generateConfirmationEmail(formData: OrderForm, refCode: string): string {
  const pkg = PACKAGE_OPTIONS.find((p) => p.id === formData.selectedPackageId);
  const basePrice = pkg?.price || 0;
  const jacketPrice = formData.addDetroitJacket ? 135 : 0;
  const grandTotal = basePrice + jacketPrice;

  // Deposit amounts
  const packageDeposit = pkg ? 100 : 0;
  const jacketDeposit = formData.addDetroitJacket ? 70 : 0;
  const depositDue = packageDeposit + jacketDeposit;

  const milestones = getPaymentMilestones(formData.selectedPackageId, formData.addDetroitJacket);

  const milestonesHtml = milestones
    .map(
      (m) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px; font-weight: bold; color: #1e293b;">${m.date}</td>
      <td style="padding: 10px; color: #475569;">${m.label.replace(/📅\s*/, "")}</td>
      <td style="padding: 10px; text-align: right; font-weight: bold; font-family: monospace; color: ${
        m.amount === 0 ? "#10b981" : "#1e40af"
      };">${m.amount === 0 ? "Fully Cleared" : `$${m.amount}`}</td>
    </tr>
  `
    )
    .join("");

  const jacketDetailsHtml = formData.addDetroitJacket
    ? `
    <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin-top: 16px;">
      <h4 style="color: #5b21b6; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">🧥 Custom Detroit Jacket Customization</h4>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #4c1d95;">
        <tr><td style="padding: 4px 0; font-weight: bold;">Jacket Size:</td><td style="text-align: right;">${formData.jacketSize}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Crossing Year:</td><td style="text-align: right;">${formData.jacketCrossingYear}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Line Initials/Name:</td><td style="text-align: right;">${formData.jacketLineName}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Full Ship Name:</td><td style="text-align: right;">${formData.jacketEntireLineName}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Line Number:</td><td style="text-align: right;">#${formData.jacketLineNumber}</td></tr>
      </table>
    </div>
  `
    : "";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 30px; font-size: 14px; line-height: 1.6; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Royal Blue Branding Header banner -->
        <div style="background-color: #1e40af; color: #ffffff; padding: 24px 30px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">PHI BETA SIGMA FRATERNITY, INC.</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.5px;">BBI CHAPTER • HOMECOMING 2026</p>
        </div>

        <div style="padding: 30px;">
          <p style="font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 0;">Good morning, Bro. ${formData.fullName},</p>
          <p style="margin-bottom: 20px;">
            Thank you for registering for the <strong>BBI Homecoming 2026 Experience</strong> in Conway, SC! We have successfully received your registration. Your unique order reference code is:
          </p>

          <!-- Order Reference Code Callout badge -->
          <div style="text-align: center; margin: 24px 0; background-color: #f1f5f9; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px;">
            <span style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #64748b; display: block; margin-bottom: 4px;">ORDER REFERENCE CODE</span>
            <code style="font-family: monospace; font-size: 18px; font-weight: 900; color: #1e40af;">${refCode}</code>
          </div>

          <h3 style="color: #0f172a; font-size: 15px; font-weight: 800; border-bottom: 2px solid #e1e7ec; padding-bottom: 6px; margin-top: 30px;">🎁 Registration Selection & Summary</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">Selected Package:</td>
              <td style="padding: 8px 0; text-align: right; color: #475569;">${pkg?.name}</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1e293b;">$${basePrice}</td>
            </tr>
            ${
              formData.addDetroitJacket
                ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">Custom Carhartt-Style Jacket:</td>
              <td style="padding: 8px 0; text-align: right; color: #475569;">Size ${formData.jacketSize} (Custom Details Box below)</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1e293b;">$135</td>
            </tr>
            `
                : ""
            }
            <tr>
              <td colspan="2" style="padding: 12px 0 4px 0; font-weight: bold; color: #0f172a; font-size: 14px;">Total Registered Cost:</td>
              <td style="padding: 12px 0 4px 0; text-align: right; font-size: 14px; font-weight: 900; color: #1e40af; font-family: monospace;">$${grandTotal}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 4px 0 12px 0; font-weight: bold; color: #22c55e; font-size: 14px;">Required Initial Deposit (by July 19):</td>
              <td style="padding: 4px 0 12px 0; text-align: right; font-size: 14px; font-weight: 950; color: #15803d; font-family: monospace;">$${depositDue}</td>
            </tr>
          </table>

          ${jacketDetailsHtml}

          <h3 style="color: #0f172a; font-size: 15px; font-weight: 800; border-bottom: 2px solid #e1e7ec; padding-bottom: 6px; margin-top: 30px;">⏰ Authorized Treasury Installment Milestones</h3>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
            To ease financial alignment, the homecoming planning committee has divided package costs over standard installments:
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                <th style="padding: 10px; color: #475569; font-weight: bold;">Due Date</th>
                <th style="padding: 10px; color: #475569; font-weight: bold;">Description/Allocation Breakdown</th>
                <th style="padding: 10px; text-align: right; color: #475569; font-weight: bold;">Amount ($)</th>
              </tr>
            </thead>
            <tbody>
              ${milestonesHtml}
            </tbody>
          </table>

          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin-bottom: 24px; font-size: 13px; color: #1e3a8a;">
            <strong>💼 Payment Action & Support:</strong><br />
            Remit all deposits and subsequent payments via **Zelle** using chapter coordinates (or cash/checks direct to our Treasury Chair). Include your unique reference code <strong>${refCode}</strong> in the memo field of each transaction!
          </div>

          <p style="margin-top: 30px; font-size: 13px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; pt-15px;">
            If you have questions about custom garment listings, football tickets, or special diet needs, hit reply and we'll take care of you! We look forward to seeing you stand tall back in Conway this November.
            <br /><br />
            Fraternally,<br />
            <strong>BBI Chapter Treasury Chair</strong><br />
            Phi Beta Sigma Fraternity, Inc.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates a polished HTML email layout for the Dynamic Payment Installment Reminder.
 */
export function generatePaymentReminderEmail(formData: OrderForm, refCode: string): string {
  const pkg = PACKAGE_OPTIONS.find((p) => p.id === formData.selectedPackageId);
  const basePrice = pkg?.price || 0;
  const jacketPrice = formData.addDetroitJacket ? 135 : 0;
  const grandTotal = basePrice + jacketPrice;

  // Deposit amounts
  const packageDeposit = pkg ? 100 : 0;
  const jacketDeposit = formData.addDetroitJacket ? 70 : 0;
  const depositDue = packageDeposit + jacketDeposit;

  const milestones = getPaymentMilestones(formData.selectedPackageId, formData.addDetroitJacket);

  const milestonesHtml = milestones
    .map(
      (m) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px; font-weight: bold; color: #1e293b;">${m.date}</td>
      <td style="padding: 10px; color: #475569;">${m.label.replace(/📅\s*/, "")}</td>
      <td style="padding: 10px; text-align: right; font-weight: bold; font-family: monospace; color: ${
        m.amount === 0 ? "#10b981" : "#b45309"
      };">${m.amount === 0 ? "No Installment" : `$${m.amount}`}</td>
    </tr>
  `
    )
    .join("");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fdfaf7; padding: 25px; font-size: 14px; line-height: 1.6; color: #451a03;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #fcd34d; box-shadow: 0 4px 10px -2px rgba(217, 119, 6, 0.08);">
        
        <!-- Gold/Amber Warn Branding Header banner -->
        <div style="background-color: #d97706; color: #ffffff; padding: 24px 30px; text-align: center;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">INSTALLMENT PAYMENT DUE REMINDER</h2>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #fef3c7; text-transform: uppercase; letter-spacing: 0.5px;">BBI Phi Beta Sigma Homecoming Treasury</p>
        </div>

        <div style="padding: 30px;">
          <p style="font-size: 15px; font-weight: bold; color: #78350f; margin-top: 0;">Good afternoon, Brother ${formData.fullName},</p>
          <p>
            This is a fraternal notification regarding your homecoming registration account. We are approaching the treasury deadlines to ensure all bespoke box printing, catering numbers, and custom Sigma Carhartt-style jacket stitching contracts can be finalized perfectly.
          </p>

          <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #b45309; text-transform: uppercase;">Registration Profile Summary</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
              <tr><td style="color: #92400e; padding: 2px 0;"><strong>Package Registered:</strong></td><td style="text-align: right; font-weight: bold;">${pkg?.name}</td></tr>
              <tr><td style="color: #92400e; padding: 2px 0;"><strong>Active Reference:</strong></td><td style="text-align: right; font-family: monospace; font-weight: bold; color: #d97706;">${refCode}</td></tr>
              <tr><td style="color: #92400e; padding: 2px 0;"><strong>Grand Total:</strong></td><td style="text-align: right; font-weight: bold;">$${grandTotal}</td></tr>
              <tr><td style="color: #92400e; padding: 2px 0;"><strong>Initial Deposit Expected:</strong></td><td style="text-align: right; font-weight: black; color: #d97706;">$${depositDue}</td></tr>
            </table>
          </div>

          <h3 style="color: #78350f; font-size: 14px; font-weight: 800; border-bottom: 2px solid #fde68a; padding-bottom: 4px;">📅 Your Milestone Payment Plan Schedule</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #fffbeb; border-bottom: 1px solid #fde68a; text-align: left;">
                <th style="padding: 8px; color: #92400e; font-weight: bold;">Date Due</th>
                <th style="padding: 8px; color: #92400e; font-weight: bold;">Installment Allocation Target</th>
                <th style="padding: 8px; text-align: right; color: #92400e; font-weight: bold;">Amount ($)</th>
              </tr>
            </thead>
            <tbody>
              ${milestonesHtml}
            </tbody>
          </table>

          <div style="background-color: #fffbfa; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; font-size: 13px; color: #991b1b; margin-top: 15px;">
            <strong>🗳️ How to complete payment:</strong><br />
            Please remit your pending balance or initial deposit amount via **Zelle** to the active chapter treasury coordinates. 
            <p style="margin: 6px 0 0 0; font-family: monospace; font-weight: bold; font-size: 13.5px; text-align: center; border: 1px dashed #fca5a5; padding: 6px; background-color: #fff5f5; border-radius: 4px;">
              Memo Reference Code Required: ${refCode}
            </p>
          </div>

          <p style="margin-top: 30px; font-size: 12.5px; color: #78350f; line-height: 1.5; border-top: 1px solid #fde68a; padding-top: 15px;">
            If you have made a recent transfer or need to review your invoice details with the Treasury chair, please respond directly to this email or send us a copy of your Zelle receipt details.
            <br /><br />
            Fraternally and in Sigma,<br />
            <strong>BBI Chapter Treasury Team</strong><br />
            Phi Beta Sigma Fraternity, Inc.
          </p>
        </div>
      </div>
    </div>
  `;
}
