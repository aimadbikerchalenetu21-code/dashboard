import { db } from "../db";
import { getDecryptedCredential } from "../credentials";
import { sendCredentialEmail } from "./brevo";
import { sendCredentialWhatsApp } from "./whatsapp";

export type DeliveryChannel = "email" | "whatsapp" | "both";

/**
 * Delivers credentials to a client via the specified channel(s).
 * Fetches full client, order, and store data, then dispatches.
 */
export async function deliverCredentials(
  credentialId: string,
  channel: DeliveryChannel = "both"
): Promise<void> {
  const credential = await getDecryptedCredential(credentialId);
  if (!credential) throw new Error(`Credential ${credentialId} not found`);

  const fullCredential = await db.credential.findUnique({
    where: { id: credentialId },
    include: {
      client: true,
      order: {
        include: {
          store: true,
        },
      },
    },
  });

  if (!fullCredential) throw new Error(`Credential ${credentialId} not found`);

  const { client, order } = fullCredential;
  const store = order.store;

  const emailData = {
    credentialId,
    clientName: client.name ?? "",
    clientEmail: client.email,
    planName: order.planName,
    m3uUrl: credential.m3uUrl,
    xtreamHost: credential.xtreamHost,
    xtreamUsername: credential.xtreamUsername,
    xtreamPassword: credential.xtreamPassword,
    expiresAt: credential.expiresAt,
    storeName: store.name,
  };

  const errors: Error[] = [];

  if (channel === "email" || channel === "both") {
    try {
      await sendCredentialEmail(emailData);
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
  }

  if ((channel === "whatsapp" || channel === "both") && client.phone) {
    try {
      await sendCredentialWhatsApp({
        ...emailData,
        clientPhone: client.phone,
      });
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // If all channels failed, throw
  if (errors.length > 0 && (channel === "both" ? errors.length === 2 : errors.length === 1)) {
    throw new Error(`Delivery failed: ${errors.map((e) => e.message).join("; ")}`);
  }
}
