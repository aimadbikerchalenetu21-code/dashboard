import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { PlanCard } from "@/components/store/plan-card";
import { StoreHeader } from "@/components/store/store-header";

// Hardcoded plan catalog per store (extend to DB-driven if needed)
interface Plan {
  id: string;
  name: string;
  duration: "1m" | "3m" | "6m" | "1yr";
  amountCents: number;
  currency: string;
  features: string[];
  highlighted?: boolean;
}

const defaultPlans: Plan[] = [
  {
    id: "basic-1m",
    name: "Basic — 1 Month",
    duration: "1m",
    amountCents: 999,
    currency: "usd",
    features: [
      "10,000+ live channels",
      "Full HD & 4K streams",
      "VOD library included",
      "1 connection",
      "24/7 support",
    ],
  },
  {
    id: "standard-3m",
    name: "Standard — 3 Months",
    duration: "3m",
    amountCents: 2499,
    currency: "usd",
    highlighted: true,
    features: [
      "10,000+ live channels",
      "Full HD & 4K streams",
      "VOD library included",
      "2 connections",
      "Priority support",
      "Save 17%",
    ],
  },
  {
    id: "premium-1yr",
    name: "Premium — 1 Year",
    duration: "1yr",
    amountCents: 7999,
    currency: "usd",
    features: [
      "10,000+ live channels",
      "Full HD & 4K streams",
      "VOD library included",
      "3 connections",
      "VIP support",
      "Save 33%",
    ],
  },
];

export default async function StorefrontPage({ params }: { params: { slug: string } }) {
  const store = await db.store.findUnique({
    where: { slug: params.slug, isActive: true },
  });

  if (!store) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <StoreHeader store={store} />

      <main className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Stream Everything,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Anywhere
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Get instant access to 10,000+ live channels, movies, and series. No contracts, no
            commitments.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {defaultPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} store={store} />
          ))}
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mb-16">
          {[
            { icon: "📺", title: "10K+ Channels", desc: "Live & on-demand" },
            { icon: "⚡", title: "Instant Access", desc: "Credentials in seconds" },
            { icon: "🔒", title: "Secure", desc: "Encrypted credentials" },
            { icon: "🌍", title: "All Devices", desc: "Smart TV, Phone, PC" },
          ].map((f) => (
            <div key={f.title} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl mb-2">{f.icon}</div>
              <p className="font-semibold text-white">{f.title}</p>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          {[
            {
              q: "How do I receive my credentials?",
              a: "Immediately after payment, your credentials are sent to your email and WhatsApp (if provided).",
            },
            {
              q: "What devices are supported?",
              a: "Any device supporting M3U or Xtream Codes: TiviMate, IPTV Smarters, VLC, MAG boxes, Smart TVs, and more.",
            },
            {
              q: "Can I try before buying?",
              a: "Contact our support team for a free 24-hour trial.",
            },
          ].map((item) => (
            <div key={item.q} className="mb-4 p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="font-semibold text-white mb-1">{item.q}</p>
              <p className="text-sm text-slate-400">{item.a}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {store.name}. All rights reserved.
      </footer>
    </div>
  );
}
