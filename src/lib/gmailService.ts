/**
 * Service to compose RFC 2822 MIME messages and dispatch them via the Gmail REST API
 */

function encodeUtf8Base64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64UrlEncode(str: string): string {
  return encodeUtf8Base64(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createMimeMessage(
  to: string,
  subject: string,
  bodyText: string,
  senderName?: string,
  senderEmail?: string
): string {
  const fromHeader = senderName && senderEmail
    ? `From: =?utf-8?B?${encodeUtf8Base64(senderName)}?= <${senderEmail}>`
    : senderEmail
    ? `From: ${senderEmail}`
    : "";

  const escapedBody = bodyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a; background-color: #f8fafc; margin: 0; padding: 24px 12px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06); }
    .header { background: linear-gradient(135deg, #090d16 0%, #172554 100%); color: #ffffff; padding: 24px 28px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #93c5fd; font-weight: 500; }
    .body-content { padding: 28px; font-size: 14.5px; color: #1e293b; white-space: pre-wrap; word-break: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .footer { padding: 18px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BBI Homecoming 2026</h1>
      <p>Beta Beta Chapter • 50th Anniversary</p>
    </div>
    <div class="body-content">${escapedBody}</div>
    <div class="footer">
      This is an official communication regarding your 2026 BBI Homecoming registration and payment schedule. For questions, reply directly to this email.
    </div>
  </div>
</body>
</html>`;

  const headers = [
    `To: ${to}`,
    ...(fromHeader ? [fromHeader] : []),
    `Subject: =?utf-8?B?${encodeUtf8Base64(subject)}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    htmlBody
  ];

  const raw = headers.join("\r\n");
  return base64UrlEncode(raw);
}

export interface GmailSendResult {
  success: boolean;
  messageId: string;
  threadId?: string;
  error?: string;
}

/**
 * Sends an email directly using the user's Gmail OAuth access token
 */
export async function sendEmailViaGmailApi(
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string,
  senderName?: string,
  senderEmail?: string
): Promise<GmailSendResult> {
  const raw = createMimeMessage(to, subject, bodyText, senderName, senderEmail);

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
    const message = errorData?.error?.message || `Gmail API dispatch error (HTTP ${response.status})`;
    throw new Error(message);
  }

  const result = await response.json();
  return {
    success: true,
    messageId: result.id,
    threadId: result.threadId
  };
}
