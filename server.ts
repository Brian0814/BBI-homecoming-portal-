import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

interface BatchEmailItem {
  to: string;
  recipientName: string;
  subject: string;
  bodyText: string;
  ref: string;
}

function createServerMimeMessage(
  to: string,
  subject: string,
  bodyText: string,
  senderName?: string,
  senderEmail?: string
): string {
  const fromHeader = senderName && senderEmail
    ? `From: =?utf-8?B?${Buffer.from(senderName, "utf-8").toString("base64")}?= <${senderEmail}>`
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
      This is an official communication regarding your 2026 BBI Homecoming registration and payment schedule.
    </div>
  </div>
</body>
</html>`;

  const headers = [
    `To: ${to}`,
    ...(fromHeader ? [fromHeader] : []),
    `Subject: =?utf-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    htmlBody
  ];

  const raw = headers.join("\r\n");
  return Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendViaGmail(
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string,
  senderName?: string,
  senderEmail?: string
) {
  const raw = createServerMimeMessage(to, subject, bodyText, senderName, senderEmail);
  const resp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw })
  });

  if (!resp.ok) {
    const errBody = (await resp.json().catch(() => ({}))) as any;
    throw new Error(errBody?.error?.message || `Gmail dispatch failed with HTTP ${resp.status}`);
  }
  return resp.json() as Promise<any>;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Check email engine status
  app.get("/api/email/status", (req, res) => {
    const hasResend = Boolean(process.env.RESEND_API_KEY);
    const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
    const authHeader = req.headers.authorization;
    const hasBearer = Boolean(authHeader?.startsWith("Bearer "));
    res.json({
      configured: hasResend || hasSendGrid || hasBearer,
      provider: hasBearer ? "gmail_oauth" : hasResend ? "resend" : hasSendGrid ? "sendgrid" : "needs_auth",
      senderEmail: process.env.SENDER_EMAIL || "bbihomecoming@gmail.com",
      senderName: process.env.SENDER_NAME || "BBI Homecoming Committee"
    });
  });

  // 1-Click Mass Batch Dispatch Endpoint
  app.post("/api/email/send-batch", async (req, res) => {
    try {
      const { emails } = req.body as { emails: BatchEmailItem[] };

      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: "Missing or empty emails array" });
      }

      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const senderEmail = process.env.SENDER_EMAIL || "bbihomecoming@gmail.com";
      const senderName = process.env.SENDER_NAME || "BBI Homecoming Committee";
      const resendApiKey = process.env.RESEND_API_KEY;
      const sendgridApiKey = process.env.SENDGRID_API_KEY;

      const results = [];

      for (let i = 0; i < emails.length; i++) {
        const item = emails[i];
        const { to, subject, bodyText, ref, recipientName } = item;
        const fallbackMsgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        if (!to || !to.includes("@")) {
          results.push({
            ref,
            to,
            recipientName,
            status: "failed",
            error: "Invalid email address",
            timestamp: new Date().toISOString()
          });
          continue;
        }

        try {
          if (accessToken) {
            // Live Gmail API dispatch
            const gmailRes = await sendViaGmail(accessToken, to, subject, bodyText, senderName, senderEmail);
            results.push({
              ref,
              to,
              recipientName,
              status: "sent",
              messageId: gmailRes.id || fallbackMsgId,
              timestamp: new Date().toISOString()
            });
          } else if (resendApiKey) {
            // Live Resend API Call
            const resp = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                from: `${senderName} <${senderEmail}>`,
                to: [to],
                subject: subject,
                text: bodyText
              })
            });

            const data = (await resp.json()) as any;
            if (resp.ok) {
              results.push({
                ref,
                to,
                recipientName,
                status: "sent",
                messageId: data.id || fallbackMsgId,
                timestamp: new Date().toISOString()
              });
            } else {
              results.push({
                ref,
                to,
                recipientName,
                status: "failed",
                error: data.message || "Failed to dispatch via Resend",
                timestamp: new Date().toISOString()
              });
            }
          } else if (sendgridApiKey) {
            // Live SendGrid API Call
            const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${sendgridApiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                personalizations: [{ to: [{ email: to, name: recipientName }] }],
                from: { email: senderEmail, name: senderName },
                subject: subject,
                content: [{ type: "text/plain", value: bodyText }]
              })
            });

            if (resp.ok || resp.status === 202) {
              results.push({
                ref,
                to,
                recipientName,
                status: "sent",
                messageId: fallbackMsgId,
                timestamp: new Date().toISOString()
              });
            } else {
              results.push({
                ref,
                to,
                recipientName,
                status: "failed",
                error: "SendGrid rejected message dispatch",
                timestamp: new Date().toISOString()
              });
            }
          } else {
            results.push({
              ref,
              to,
              recipientName,
              status: "failed",
              error: "Google Sign-In required to send live emails to recipient inboxes via Gmail API",
              timestamp: new Date().toISOString()
            });
          }
        } catch (err: any) {
          console.error(`Error sending email to ${to}:`, err);
          results.push({
            ref,
            to,
            recipientName,
            status: "failed",
            error: err?.message || "Delivery exception",
            timestamp: new Date().toISOString()
          });
        }
      }

      const totalSent = results.filter((r) => r.status === "sent").length;
      const totalFailed = results.filter((r) => r.status === "failed").length;

      return res.json({
        success: totalSent > 0,
        total: emails.length,
        sent: totalSent,
        failed: totalFailed,
        results
      });
    } catch (error: any) {
      console.error("Batch dispatch fatal error:", error);
      return res.status(500).json({ error: error.message || "Internal server batch error" });
    }
  });

  // Single Email Dispatch Endpoint
  app.post("/api/email/send-single", async (req, res) => {
    try {
      const { to, subject, bodyText, ref, recipientName, senderName, senderEmail } = req.body;
      if (!to) {
        return res.status(400).json({ error: "Missing recipient email" });
      }

      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const effectiveSenderName = senderName || process.env.SENDER_NAME || "BBI Homecoming Committee";
      const effectiveSenderEmail = senderEmail || process.env.SENDER_EMAIL || "bbihomecoming@gmail.com";

      if (accessToken) {
        // Dispatch live email via Gmail REST API
        const gmailRes = await sendViaGmail(
          accessToken,
          to,
          subject,
          bodyText,
          effectiveSenderName,
          effectiveSenderEmail
        );

        console.log(`[Gmail API] Live Email Delivered: To: "${recipientName}" <${to}> | ID: ${gmailRes.id}`);
        return res.json({
          success: true,
          messageId: gmailRes.id,
          threadId: gmailRes.threadId,
          timestamp: new Date().toISOString()
        });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: `${effectiveSenderName} <${effectiveSenderEmail}>`,
            to: [to],
            subject: subject,
            text: bodyText
          })
        });
        const data = (await resp.json()) as any;
        if (resp.ok) {
          return res.json({
            success: true,
            messageId: data.id,
            timestamp: new Date().toISOString()
          });
        }
        return res.status(502).json({ error: data.message || "Resend dispatch failed" });
      }

      return res.status(401).json({
        error: "Google Sign-In required. Please sign in with Google to send live emails from your Gmail account.",
        needsAuth: true
      });
    } catch (err: any) {
      console.error("Single email error:", err);
      return res.status(500).json({ error: err.message || "Failed to dispatch email" });
    }
  });

  // Vite middleware for development vs static for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
