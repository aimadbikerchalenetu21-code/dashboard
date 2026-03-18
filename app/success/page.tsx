import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import Link from "next/link";
import { CheckCircle2, Mail, MessageCircle } from "lucide-react";

async function getSessionDetails(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const order = await db.order.findUnique({
      where: { stripeSessionId: sessionId },
      include: {
        store: true,
        credentials: {
          take: 1,
          select: { deliveredAt: true },
        },
      },
    });
    return { session, order };
  } catch {
    return { session: null, order: null };
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  const { session, order } = sessionId
    ? await getSessionDetails(sessionId)
    : { session: null, order: null };

  const storeName = order?.store?.name ?? "IPTV Platform";
  const storeSlug = order?.store?.slug;
  const customerEmail = session?.customer_email ?? session?.customer_details?.email;
  const isDelivered = order?.credentials?.[0]?.deliveredAt != null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-slate-400 mb-6">
            Thank you for subscribing to {storeName}. Your IPTV credentials are being
            delivered right now.
          </p>

          {/* Delivery status */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-3">
            {customerEmail && (
              <div className="flex items-center gap-3 text-left">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDelivered ? "bg-green-500/20" : "bg-indigo-500/20"}`}
                >
                  <Mail
                    className={`w-4 h-4 ${isDelivered ? "text-green-400" : "text-indigo-400"}`}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Email delivery</p>
                  <p className="text-xs text-slate-400">
                    {isDelivered ? `Sent to ${customerEmail}` : `Sending to ${customerEmail}…`}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">WhatsApp delivery</p>
                <p className="text-xs text-slate-400">
                  Sent to your WhatsApp if provided
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 mb-6">
            Check your inbox (and spam folder). Credentials are usually delivered within 60
            seconds.
          </div>

          <div className="flex flex-col gap-3">
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
    </div>
  );
}
