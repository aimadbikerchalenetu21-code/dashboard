"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  duration: "1m" | "3m" | "6m" | "1yr";
  amountCents: number;
  currency: string;
  features: string[];
  highlighted?: boolean;
}

interface Store {
  id: string;
  name: string;
  slug: string;
}

interface PlanCardProps {
  plan: Plan;
  store: Store;
}

function formatPrice(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

const durationLabel: Record<string, string> = {
  "1m": "/ month",
  "3m": "/ 3 months",
  "6m": "/ 6 months",
  "1yr": "/ year",
};

export function PlanCard({ plan, store }: PlanCardProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          planName: plan.name,
          planDuration: plan.duration,
          amountCents: plan.amountCents,
          currency: plan.currency,
          clientEmail: email,
          clientPhone: phone || undefined,
          clientName: name || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      router.push(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col ${
        plan.highlighted
          ? "border-indigo-500 bg-indigo-600/20 shadow-xl shadow-indigo-500/20"
          : "border-white/10 bg-white/5"
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-white" />
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-bold text-lg text-white mb-1">{plan.name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-white">
            {formatPrice(plan.amountCents, plan.currency)}
          </span>
          <span className="text-slate-400 text-sm">{durationLabel[plan.duration]}</span>
        </div>
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
            <Check className="w-4 h-4 text-indigo-400 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className={`w-full ${
            plan.highlighted
              ? "bg-indigo-500 hover:bg-indigo-600 text-white"
              : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
          }`}
        >
          Get Started
        </Button>
      ) : (
        <form onSubmit={handleCheckout} className="space-y-3">
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded p-2">
              {error}
            </p>
          )}
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-indigo-400"
          />
          <input
            type="email"
            placeholder="Email address *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-indigo-400"
          />
          <input
            type="tel"
            placeholder="WhatsApp number (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-indigo-400"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing…
              </>
            ) : (
              "Proceed to Payment"
            )}
          </Button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="w-full text-xs text-slate-500 hover:text-slate-400 py-1"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
