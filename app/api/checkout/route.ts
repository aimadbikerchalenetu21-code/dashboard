import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { PlanDuration } from "@prisma/client";

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

function toPlanDuration(raw: string): PlanDuration {
  const map: Record<string, PlanDuration> = {
    "1m": PlanDuration.ONE_MONTH,
    "3m": PlanDuration.THREE_MONTHS,
    "6m": PlanDuration.SIX_MONTHS,
    "1yr": PlanDuration.ONE_YEAR,
  };
  return map[raw] ?? PlanDuration.ONE_MONTH;
}

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

  const { storeId, planName, planDuration, amountCents, currency, clientEmail, clientPhone, clientName } = parsed.data;

  const store = await db.store.findUnique({ where: { id: storeId } });
  if (!store || !store.isActive) {
    return NextResponse.json({ error: "Store not found or inactive" }, { status: 404 });
  }

  // Upsert client
  const client = await db.client.upsert({
    where: { email: clientEmail },
    update: {
      ...(clientName && { name: clientName }),
      ...(clientPhone && { phone: clientPhone }),
    },
    create: { email: clientEmail, name: clientName, phone: clientPhone },
  });

  // Create pending order
  const order = await db.order.create({
    data: {
      storeId,
      clientId: client.id,
      planName,
      planDuration: toPlanDuration(planDuration),
      amountCents,
      currency,
      status: "PENDING",
    },
  });

  return NextResponse.json({ orderId: order.id });
}
