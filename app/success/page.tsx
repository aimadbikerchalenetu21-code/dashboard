import { db } from "@/lib/db";
import Link from "next/link";
import { CheckCircle2, Clock, Mail, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

async function getOrder(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      store: { select: { name: true, slug: true } },
      client: { select: { email: true, name: true, phone: true } },
    },
  });
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { order_id?: string };
}) {
  const order = searchParams.order_id ? await getOrder(searchParams.order_id) : null;

  const storeName = order?.store?.name ?? "IPTV Platform";
  const storeSlug = order?.store?.slug;
  const clientEmail = order?.client?.email;
  const hasPhone = !!order?.client?.phone;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">

          {/* Icon */}
          <div className="flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Order Received!</h1>
          <p className="text-slate-400 mb-6">
            Thank you for your order at <span className="text-white font-medium">{storeName}</span>.
            Your subscription is pending payment confirmation by our team.
          </p>

          {/* Status card */}
          <div className="bg-white/5 rounded-xl p-5 mb-6 text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Awaiting payment confirmation</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Our team will confirm your payment and activate your subscription shortly.
                </p>
              </div>
            </div>

            {clientEmail && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Credentials sent to your email</p>
                  <p className="text-xs text-slate-400 mt-0.5">{clientEmail}</p>
                </div>
              </div>
            )}

            {hasPhone && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">WhatsApp notification enabled</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    You&apos;ll also receive credentials via WhatsApp once confirmed.
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mb-6">
            Once your payment is confirmed, your IPTV credentials will be delivered automatically
            to your email{hasPhone ? " and WhatsApp" : ""}. This usually happens within a few minutes.
          </p>

          {storeSlug && (
            <Link
              href={`/stores/${storeSlug}`}
              className="block py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            >
              Back to Store
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
