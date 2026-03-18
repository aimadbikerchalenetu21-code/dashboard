import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import { generateCredential } from "@/lib/credentials";
import { deliverCredentials } from "@/lib/delivery";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await db.order.findUnique({
    where: { id: params.id },
    include: { client: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === OrderStatus.PAID) {
    return NextResponse.json({ error: "Order is already paid" }, { status: 409 });
  }

  const paidAt = new Date();

  // Mark order as paid
  await db.order.update({
    where: { id: params.id },
    data: { status: OrderStatus.PAID, paidAt },
  });

  // Generate credential
  const credential = await generateCredential(order.id, order.clientId, order.planDuration, paidAt);

  // Deliver async (email + WhatsApp)
  deliverCredentials(credential.id, "both").catch((err) => {
    console.error("[ConfirmOrder] Delivery failed:", err);
  });

  return NextResponse.json({ success: true, credentialId: credential.id });
}
