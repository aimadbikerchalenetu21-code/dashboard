import { DeliveryChannel, DeliveryStatus } from "@prisma/client";
import { format } from "date-fns";
import { db } from "../db";

const META_API_BASE = "https://graph.facebook.com/v18.0";

interface WhatsAppCredentialData {
  credentialId: string;
  clientPhone: string;
  clientName: string;
  planName: string;
  m3uUrl: string;
  xtreamHost: string;
  xtreamUsername: string;
  xtreamPassword: string;
  expiresAt: Date;
  storeName: string;
}

/**
 * Normalizes a phone number to E.164 format.
 * Strips all non-digit chars and prepends '+' if missing.
 */
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Assume international format if starts with country code
  return digits.startsWith("0") ? `+${digits.slice(1)}` : `+${digits}`;
}

/**
 * Sends IPTV credentials via WhatsApp using Meta Cloud API template message.
 * Requires a pre-approved WhatsApp message template named "iptv_credentials".
 *
 * Template parameters (in order):
 *   1. clientName
 *   2. planName
 *   3. storeName
 *   4. xtreamHost
 *   5. xtreamUsername
 *   6. xtreamPassword
 *   7. m3uUrl
 *   8. expiresAt (formatted)
 */
export async function sendCredentialWhatsApp(data: WhatsAppCredentialData): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME ?? "iptv_credentials";

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp API credentials are not configured");
  }

  const recipientPhone = toE164(data.clientPhone);
  const expiryFormatted = format(data.expiresAt, "MMMM d, yyyy");

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: data.clientName || "Valued Customer" },
            { type: "text", text: data.planName },
            { type: "text", text: data.storeName },
            { type: "text", text: data.xtreamHost },
            { type: "text", text: data.xtreamUsername },
            { type: "text", text: data.xtreamPassword },
            { type: "text", text: data.m3uUrl },
            { type: "text", text: expiryFormatted },
          ],
        },
      ],
    },
  };

  // Create pending log
  const log = await db.deliveryLog.create({
    data: {
      credentialId: data.credentialId,
      channel: DeliveryChannel.WHATSAPP,
      status: DeliveryStatus.PENDING,
    },
  });

  try {
    const url = `${META_API_BASE}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`WhatsApp API error ${response.status}: ${errText}`);
    }

    await db.deliveryLog.update({
      where: { id: log.id },
      data: { status: DeliveryStatus.SENT, sentAt: new Date() },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    await db.deliveryLog.update({
      where: { id: log.id },
      data: { status: DeliveryStatus.FAILED, error: errMsg },
    });
    throw error;
  }
}
