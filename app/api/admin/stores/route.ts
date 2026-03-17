import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/lib/db";

const createStoreSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  domain: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, slug, domain, logoUrl } = parsed.data;

  const existing = await db.store.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "A store with this slug already exists" }, { status: 409 });
  }

  const store = await db.store.create({
    data: {
      name,
      slug,
      domain: domain || null,
      logoUrl: logoUrl || null,
    },
  });

  return NextResponse.json(store, { status: 201 });
}
