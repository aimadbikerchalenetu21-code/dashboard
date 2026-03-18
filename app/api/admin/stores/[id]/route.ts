import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const updateStoreSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  domain: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const store = await db.store.findUnique({ where: { id: params.id } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  // Check slug uniqueness if changing
  if (parsed.data.slug && parsed.data.slug !== store.slug) {
    const conflict = await db.store.findUnique({ where: { slug: parsed.data.slug } });
    if (conflict) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }
  }

  const updated = await db.store.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      logoUrl: parsed.data.logoUrl || null,
      domain: parsed.data.domain || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.store.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
