import { PlanDuration } from "@prisma/client";
import { addMonths, addYears } from "date-fns";
import { db } from "./db";
import { encrypt, generatePassword } from "./encryption";

/**
 * Maps PlanDuration enum to expiry date offset from paidAt.
 */
function getExpiresAt(paidAt: Date, planDuration: PlanDuration): Date {
  switch (planDuration) {
    case PlanDuration.ONE_MONTH:
      return addMonths(paidAt, 1);
    case PlanDuration.THREE_MONTHS:
      return addMonths(paidAt, 3);
    case PlanDuration.SIX_MONTHS:
      return addMonths(paidAt, 6);
    case PlanDuration.ONE_YEAR:
      return addYears(paidAt, 1);
    default:
      throw new Error(`Unknown plan duration: ${planDuration}`);
  }
}

/**
 * Generates a unique M3U URL for the given username.
 */
function generateM3uUrl(host: string, username: string, password: string): string {
  return `${host}/get.php?username=${username}&password=${password}&type=m3u_plus&output=m3u8`;
}

export interface CredentialData {
  id: string;
  clientId: string;
  orderId: string;
  m3uUrl: string;
  xtreamHost: string;
  xtreamUsername: string;
  xtreamPassword: string; // decrypted — only used at delivery time
  expiresAt: Date;
  deliveredAt: Date | null;
  isActive: boolean;
}

/**
 * Generates a new credential for an order.
 * - Creates a unique Xtream Codes username/password
 * - Encrypts the password at rest
 * - Saves to DB
 * - Returns the credential with decrypted password for immediate delivery
 */
export async function generateCredential(
  orderId: string,
  clientId: string,
  planDuration: PlanDuration,
  paidAt: Date
): Promise<CredentialData> {
  const xtreamHost = process.env.XTREAM_HOST ?? "https://iptv.example.com";
  const xtreamUsername = `user_${clientId.slice(0, 8)}_${Date.now()}`;
  const rawPassword = generatePassword(16);
  const encryptedPassword = encrypt(rawPassword);
  const expiresAt = getExpiresAt(paidAt, planDuration);
  const m3uUrl = generateM3uUrl(xtreamHost, xtreamUsername, rawPassword);

  const credential = await db.credential.create({
    data: {
      clientId,
      orderId,
      m3uUrl,
      xtreamHost,
      xtreamUsername,
      xtreamPassword: encryptedPassword,
      expiresAt,
      isActive: true,
    },
  });

  return {
    ...credential,
    xtreamPassword: rawPassword, // return plaintext for immediate delivery
  };
}

/**
 * Fetches a credential from DB and decrypts the password.
 */
export async function getDecryptedCredential(credentialId: string): Promise<CredentialData | null> {
  const { decrypt } = await import("./encryption");

  const credential = await db.credential.findUnique({
    where: { id: credentialId },
  });

  if (!credential) return null;

  return {
    ...credential,
    xtreamPassword: decrypt(credential.xtreamPassword),
  };
}
