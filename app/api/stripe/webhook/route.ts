import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { OrderStatus, PlanDuration } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { generateCredential } from "@/lib/credentials";
import { deliverCredentials } from "@/lib/delivery";
import type { StripeMetadata } from "@/lib/stripe";

export const runtime = "nodejs";

function parsePlanDuration(raw: string): PlanDuration {
  const map: Record<string, PlanDuration> = {
    "1m": PlanDuration.ONE_MONTH,
    "3m": PlanDuration.THREE_MONTHS,
    "6m": PlanDuration.SIX_MONTHS,
    "1yr": PlanDuration.ONE_YEAR,
    "1y": PlanDuration.ONE_YEAR,
    ONE_MONTH: PlanDuration.ONE_MONTH,
    THREE_MONTHS: PlanDuration.THREE_MONTHS,
    SIX_MONTHS: PlanDuration.SIX_MONTHS,
    ONE_YEAR: PlanDuration.ONE_YEAR,
  };
  return map[raw] ?? PlanDuration.ONE_MONTH;
}

/**
 * Processes a completed checkout session.
 * Idempotent — skips if stripeSessionId already processed.
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const sessionId = session.id;

  // Idempotency: skip if already processed
  const existing = await db.order.findUnique({
    where: { stripeSessionId: sessionId },
  });
  if (existing?.status === OrderStatus.PAID) {
    console.log(`[Webhook] Session ${sessionId} already processed — skipping`);
    return;
  }

  const metadata = (session.metadata ?? {}) as Partial<StripeMetadata>;
  const {
    storeId,
    planName = "Unknown Plan",
    planDuration = "1m",
    clientEmail,
    clientPhone,
    clientName,
  } = metadata;

  if (!storeId || !clientEmail) {
    console.error("[Webhook] Missing required metadata", { storeId, clientEmail });
    return;
  }

  const paidAt = new Date();
  const amountCents = session.amount_total ?? 0;
  const currency = session.currency ?? "usd";
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : undefined;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : undefined;

  // Upsert client
  const client = await db.client.upsert({
    where: { email: clientEmail },
    update: {
      ...(clientName && { name: clientName }),
      ...(clientPhone && { phone: clientPhone }),
      ...(stripeCustomerId && { stripeCustomerId }),
    },
    create: {
      email: clientEmail,
      name: clientName,
      phone: clientPhone,
      stripeCustomerId,
    },
  });

  // Create or update order
  let order = existing;
  if (!order) {
    order = await db.order.create({
      data: {
        storeId,
        clientId: client.id,
        planName,
        planDuration: parsePlanDuration(planDuration),
        amountCents,
        currency,
        stripeSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
        status: OrderStatus.PAID,
        paidAt,
      },
    });
  } else {
    order = await db.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paidAt,
        stripePaymentIntentId: paymentIntentId,
      },
    });
  }

  // Generate credential
  const credential = await generateCredential(
    order.id,
    client.id,
    parsePlanDuration(planDuration),
    paidAt
  );

  // Deliver async (don't await — return 200 to Stripe immediately after this fn)
  deliverCredentials(credential.id, "both").catch((err) => {
    console.error("[Webhook] Delivery failed for credential", credential.id, err);
  });

  console.log(`[Webhook] Processed session ${sessionId} → order ${order.id} → credential ${credential.id}`);
}

/**
 * Handles invoice payment succeeded (subscription renewal).
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  console.log("[Webhook] invoice.payment_succeeded", invoice.id);

  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : undefined;
  if (!customerId) return;

  const client = await db.client.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!client) {
    console.warn("[Webhook] No client found for Stripe customer", customerId);
    return;
  }

  // Renew or extend the most recent active credential for this client
  const latestCredential = await db.credential.findFirst({
    where: { clientId: client.id, isActive: true },
    include: { order: true },
    orderBy: { createdAt: "desc" },
  });

  if (!latestCredential) {
    console.warn("[Webhook] No active credential for renewal", client.id);
    return;
  }

  // Generate a new credential for the renewed period
  const newCredential = await generateCredential(
    latestCredential.orderId,
    client.id,
    latestCredential.order.planDuration,
    new Date()
  );

  // Deactivate old credential
  await db.credential.update({
    where: { id: latestCredential.id },
    data: { isActive: false },
  });

  deliverCredentials(newCredential.id, "both").catch((err) => {
    console.error("[Webhook] Renewal delivery failed", newCredential.id, err);
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
  }

  // Return 200 immediately, process async
  // (Next.js App Router: we must await processing before returning
  //  but we kick off any slow work without blocking the response)
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[Webhook] Processing error:", err);
    // Still return 200 to prevent Stripe from retrying (we logged it)
    return NextResponse.json({ received: true, error: "Processing error (logged)" });
  }

  return NextResponse.json({ received: true });
}
