import { DeliveryChannel, DeliveryStatus } from "@prisma/client";
import { format } from "date-fns";
import { db } from "../db";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface BrevoEmailPayload {
  sender: { name: string; email: string };
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  params?: Record<string, string>;
}

interface CredentialEmailData {
  credentialId: string;
  clientName: string;
  clientEmail: string;
  planName: string;
  m3uUrl: string;
  xtreamHost: string;
  xtreamUsername: string;
  xtreamPassword: string;
  expiresAt: Date;
  storeName: string;
}

function buildEmailHtml(data: CredentialEmailData): string {
  const expiryFormatted = format(data.expiresAt, "MMMM d, yyyy");
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your IPTV Credentials</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; color: #374151; margin-bottom: 24px; }
    .credentials-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0; }
    .credentials-card h2 { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6366f1; margin: 0 0 16px; }
    .cred-row { display: flex; flex-direction: column; margin-bottom: 12px; }
    .cred-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
    .cred-value { font-family: 'Courier New', monospace; font-size: 14px; color: #111827; background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 12px; word-break: break-all; }
    .m3u-value { font-size: 12px; }
    .plan-badge { display: inline-block; background: #ede9fe; color: #6d28d9; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; }
    .expiry-notice { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #92400e; margin-top: 16px; }
    .footer { padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { font-size: 12px; color: #9ca3af; margin: 4px 0; }
    .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 Your IPTV Subscription is Ready!</h1>
      <p>${data.storeName}</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${data.clientName || "Valued Customer"},</p>
      <p style="color:#4b5563;font-size:15px;">Your payment has been confirmed. Here are your IPTV credentials to get started immediately.</p>

      <span class="plan-badge">${data.planName}</span>

      <div class="credentials-card">
        <h2>Your Credentials</h2>

        <div class="cred-row">
          <span class="cred-label">Server / Host</span>
          <span class="cred-value">${data.xtreamHost}</span>
        </div>

        <div class="cred-row">
          <span class="cred-label">Username</span>
          <span class="cred-value">${data.xtreamUsername}</span>
        </div>

        <div class="cred-row">
          <span class="cred-label">Password</span>
          <span class="cred-value">${data.xtreamPassword}</span>
        </div>

        <div class="cred-row">
          <span class="cred-label">M3U Playlist URL</span>
          <span class="cred-value m3u-value">${data.m3uUrl}</span>
        </div>

        <div class="expiry-notice">
          ⏰ Your subscription expires on <strong>${expiryFormatted}</strong>
        </div>
      </div>

      <div class="divider"></div>

      <p style="font-size:13px;color:#6b7280;">
        <strong>How to connect:</strong> Open your IPTV player (TiviMate, IPTV Smarters, VLC, etc.) and enter the credentials above. For M3U players, use the playlist URL directly.
      </p>

      <p style="font-size:13px;color:#6b7280;margin-top:12px;">
        Need help? Reply to this email and our support team will assist you within 24 hours.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${data.storeName}. All rights reserved.</p>
      <p>You received this email because you purchased an IPTV subscription.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendCredentialEmail(data: CredentialEmailData): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not set");

  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? "noreply@iptvplatform.com";
  const senderName = process.env.BREVO_SENDER_NAME ?? data.storeName;

  const payload: BrevoEmailPayload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: data.clientEmail, name: data.clientName ?? undefined }],
    subject: `🎬 Your ${data.planName} IPTV Credentials — ${data.storeName}`,
    htmlContent: buildEmailHtml(data),
  };

  // Create a pending log entry
  const log = await db.deliveryLog.create({
    data: {
      credentialId: data.credentialId,
      channel: DeliveryChannel.EMAIL,
      status: DeliveryStatus.PENDING,
    },
  });

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Brevo API error ${response.status}: ${errText}`);
    }

    // Mark credential as delivered and update log
    await Promise.all([
      db.credential.update({
        where: { id: data.credentialId },
        data: { deliveredAt: new Date() },
      }),
      db.deliveryLog.update({
        where: { id: log.id },
        data: { status: DeliveryStatus.SENT, sentAt: new Date() },
      }),
    ]);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    await db.deliveryLog.update({
      where: { id: log.id },
      data: { status: DeliveryStatus.FAILED, error: errMsg },
    });
    throw error;
  }
}
