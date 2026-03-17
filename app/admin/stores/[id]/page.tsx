import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate, planDurationLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreEditForm } from "@/components/admin/store-edit-form";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  PAID: "success",
  PENDING: "warning",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
};

export default async function StoreDetailPage({ params }: { params: { id: string } }) {
  const store = await db.store.findUnique({
    where: { id: params.id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          client: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!store) notFound();

  const paidOrders = store.orders.filter((o) => o.status === "PAID");
  const revenue = paidOrders.reduce((s, o) => s + o.amountCents, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        href="/admin/stores"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to stores
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={store.isActive ? "success" : "secondary"}>
              {store.isActive ? "Active" : "Inactive"}
            </Badge>
            <Link
              href={`/stores/${store.slug}`}
              target="_blank"
              className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
            >
              View storefront <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">{store.orders.length}</p>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">{paidOrders.length}</p>
            <p className="text-sm text-muted-foreground">Paid Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(revenue)}</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <StoreEditForm store={store} />
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Duration</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {store.orders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-6 py-3">
                      <p className="font-medium">{order.client.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{order.client.email}</p>
                    </td>
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
                  </tr>
                ))}
                {store.orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
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
