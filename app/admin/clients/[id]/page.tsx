import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate, planDurationLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResendCredentialsButton } from "@/components/admin/resend-button";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, User } from "lucide-react";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  PAID: "success",
  PENDING: "warning",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
};

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await db.client.findUnique({
    where: { id: params.id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          store: { select: { name: true } },
          credentials: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, isActive: true, expiresAt: true, deliveredAt: true },
          },
        },
      },
      credentials: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        include: { order: { select: { planName: true } } },
      },
    },
  });

  if (!client) notFound();

  const totalSpent = client.orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.amountCents, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to clients
      </Link>

      {/* Profile */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">{client.name ?? "Unknown"}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {client.email}
                </span>
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {client.phone}
                  </span>
                )}
              </div>
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalSpent)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{client.orders.length}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {client.credentials.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Subs</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Credentials */}
      {client.credentials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Username</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Expires</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {client.credentials.map((cred) => (
                    <tr key={cred.id} className="border-b last:border-0">
                      <td className="px-6 py-3 font-medium">{cred.order.planName}</td>
                      <td className="px-6 py-3 font-mono text-xs">{cred.xtreamUsername}</td>
                      <td className="px-6 py-3">
                        <span
                          className={
                            new Date(cred.expiresAt) < new Date()
                              ? "text-red-600"
                              : "text-green-600"
                          }
                        >
                          {formatDate(cred.expiresAt)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <ResendCredentialsButton credentialId={cred.id} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Store</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Duration</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {client.orders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-6 py-3 text-muted-foreground">{order.store.name}</td>
                    <td className="px-6 py-3">{order.planName}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {planDurationLabel(order.planDuration)}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      {formatCurrency(order.amountCents, order.currency)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant[order.status] ?? "secondary"}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-3">
                      {order.credentials[0] && (
                        <ResendCredentialsButton
                          credentialId={order.credentials[0].id}
                          size="sm"
                        />
                      )}
                    </td>
                  </tr>
                ))}
                {client.orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
