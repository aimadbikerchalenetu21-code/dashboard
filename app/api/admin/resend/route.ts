import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { deliverCredentials } from "@/lib/delivery";

const resendSchema = z.object({
  credentialId: z.string().min(1),
  channel: z.enum(["email", "whatsapp", "both"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { credentialId, channel } = parsed.data;

  try {
    await deliverCredentials(credentialId, channel);
    return NextResponse.json({ success: true, credentialId, channel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delivery failed";
    console.error("[Resend API]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
