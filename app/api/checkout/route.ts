import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  storeId: z.string().min(1),
  planName: z.string().min(1),
  planDuration: z.enum(["1m", "3m", "6m", "1yr"]),
  amountCents: z.number().int().positive(),
  currency: z.string().default("usd"),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  clientName: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    storeId,
    planName,
    planDuration,
    amountCents,
    currency,
    clientEmail,
    clientPhone,
    clientName,
  } = parsed.data;

  // Verify store exists
  const store = await db.store.findUnique({ where: { id: storeId } });
  if (!store || !store.isActive) {
    return NextResponse.json({ error: "Store not found or inactive" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Create a pending order for tracking before Stripe
  const order = await db.order.create({
    data: {
      storeId,
      clientId: (
        await db.client.upsert({
          where: { email: clientEmail },
          update: {
            ...(clientName && { name: clientName }),
            ...(clientPhone && { phone: clientPhone }),
          },
          create: { email: clientEmail, name: clientName, phone: clientPhone },
        })
      ).id,
      planName,
      planDuration:
        planDuration === "1m"
          ? "ONE_MONTH"
          : planDuration === "3m"
            ? "THREE_MONTHS"
            : planDuration === "6m"
              ? "SIX_MONTHS"
              : "ONE_YEAR",
      amountCents,
      currency,
      status: OrderStatus.PENDING,
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: `${store.name} — ${planName}`,
            description: `IPTV subscription (${planDuration === "1m" ? "1 Month" : planDuration === "3m" ? "3 Months" : planDuration === "6m" ? "6 Months" : "1 Year"})`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    customer_email: clientEmail,
    metadata: {
      storeId,
      storeSlug: store.slug,
      storeName: store.name,
      planName,
      planDuration,
      clientEmail,
      clientPhone: clientPhone ?? "",
      clientName: clientName ?? "",
      internalOrderId: order.id,
    },
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/stores/${store.slug}?cancelled=1`,
  });

  // Update order with Stripe session ID
  await db.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}
