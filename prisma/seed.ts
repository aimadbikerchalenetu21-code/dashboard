import { PrismaClient, PlanDuration, OrderStatus } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

/**
 * Creates a SHA-256 hash of the password (used for the seed admin).
 * In production, use bcryptjs: npm i bcryptjs && bcryptjs.hashSync(pw, 10)
 */
function sha256Hash(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

const STORE_1_PLANS = [
  {
    name: "Starter — 1 Month",
    duration: PlanDuration.ONE_MONTH,
    amountCents: 999,
    currency: "usd",
  },
  {
    name: "Pro — 3 Months",
    duration: PlanDuration.THREE_MONTHS,
    amountCents: 2499,
    currency: "usd",
  },
  {
    name: "Ultimate — 1 Year",
    duration: PlanDuration.ONE_YEAR,
    amountCents: 7999,
    currency: "usd",
  },
];

const STORE_2_PLANS = [
  {
    name: "Basic — 1 Month",
    duration: PlanDuration.ONE_MONTH,
    amountCents: 799,
    currency: "usd",
  },
  {
    name: "Standard — 3 Months",
    duration: PlanDuration.THREE_MONTHS,
    amountCents: 1999,
    currency: "usd",
  },
  {
    name: "Premium — 1 Year",
    duration: PlanDuration.ONE_YEAR,
    amountCents: 6999,
    currency: "usd",
  },
];

async function main() {
  console.log("🌱 Seeding database…");

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@iptv-platform.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Platform Admin",
      passwordHash: sha256Hash(adminPassword),
      role: "admin",
    },
  });
  console.log(`✅ Admin user: ${admin.email} (password: ${adminPassword})`);

  // ── Store 1: StreamZone ─────────────────────────────────────────────────────
  const store1 = await prisma.store.upsert({
    where: { slug: "streamzone" },
    update: {},
    create: {
      name: "StreamZone",
      slug: "streamzone",
      domain: "streamzone.example.com",
      isActive: true,
    },
  });
  console.log(`✅ Store 1: ${store1.name} → /stores/${store1.slug}`);

  // ── Store 2: TeleVault ──────────────────────────────────────────────────────
  const store2 = await prisma.store.upsert({
    where: { slug: "televault" },
    update: {},
    create: {
      name: "TeleVault",
      slug: "televault",
      domain: "televault.example.com",
      isActive: true,
    },
  });
  console.log(`✅ Store 2: ${store2.name} → /stores/${store2.slug}`);

  // ── Demo clients ────────────────────────────────────────────────────────────
  const client1 = await prisma.client.upsert({
    where: { email: "john.doe@example.com" },
    update: {},
    create: {
      email: "john.doe@example.com",
      name: "John Doe",
      phone: "+12125550100",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { email: "jane.smith@example.com" },
    update: {},
    create: {
      email: "jane.smith@example.com",
      name: "Jane Smith",
      phone: "+442071234567",
    },
  });

  const client3 = await prisma.client.upsert({
    where: { email: "ali.hassan@example.com" },
    update: {},
    create: {
      email: "ali.hassan@example.com",
      name: "Ali Hassan",
      phone: "+971501234567",
    },
  });

  console.log("✅ Demo clients created");

  // ── Demo orders & credentials ───────────────────────────────────────────────
  const demoOrdersData = [
    {
      client: client1,
      store: store1,
      planName: STORE_1_PLANS[1].name,
      planDuration: STORE_1_PLANS[1].duration,
      amountCents: STORE_1_PLANS[1].amountCents,
      stripeSessionId: `cs_demo_${client1.id}_1`,
    },
    {
      client: client2,
      store: store2,
      planName: STORE_2_PLANS[2].name,
      planDuration: STORE_2_PLANS[2].duration,
      amountCents: STORE_2_PLANS[2].amountCents,
      stripeSessionId: `cs_demo_${client2.id}_1`,
    },
    {
      client: client3,
      store: store1,
      planName: STORE_1_PLANS[2].name,
      planDuration: STORE_1_PLANS[2].duration,
      amountCents: STORE_1_PLANS[2].amountCents,
      stripeSessionId: `cs_demo_${client3.id}_1`,
    },
  ];

  for (const od of demoOrdersData) {
    const existing = await prisma.order.findUnique({
      where: { stripeSessionId: od.stripeSessionId },
    });
    if (existing) continue;

    const order = await prisma.order.create({
      data: {
        storeId: od.store.id,
        clientId: od.client.id,
        planName: od.planName,
        planDuration: od.planDuration,
        amountCents: od.amountCents,
        currency: "usd",
        stripeSessionId: od.stripeSessionId,
        status: OrderStatus.PAID,
        paidAt: new Date(),
      },
    });

    // Create a demo credential (password not actually encrypted for seed simplicity)
    const expiresAt = new Date();
    const monthsMap: Record<string, number> = {
      ONE_MONTH: 1,
      THREE_MONTHS: 3,
      SIX_MONTHS: 6,
      ONE_YEAR: 12,
    };
    expiresAt.setMonth(expiresAt.getMonth() + (monthsMap[od.planDuration] ?? 1));

    const username = `user_${od.client.id.slice(0, 8)}_demo`;
    const rawPassword = "DemoPass123!";
    // In real usage, use encrypt() from lib/encryption.ts
    const { encrypt } = await import("../lib/encryption");
    const encPassword = process.env.ENCRYPTION_KEY ? encrypt(rawPassword) : rawPassword;

    await prisma.credential.create({
      data: {
        clientId: od.client.id,
        orderId: order.id,
        m3uUrl: `https://iptv.example.com/get.php?username=${username}&password=${rawPassword}&type=m3u_plus`,
        xtreamHost: "https://iptv.example.com",
        xtreamUsername: username,
        xtreamPassword: encPassword,
        expiresAt,
        isActive: true,
        deliveredAt: new Date(),
      },
    });

    console.log(
      `✅ Order + credential created for ${od.client.email} (${od.planName})`
    );
  }

  console.log("\n🎉 Seed complete!");
  console.log(`\n📋 Login at /admin/login`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`\n🏪 Storefronts:`);
  console.log(`   /stores/streamzone`);
  console.log(`   /stores/televault`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
