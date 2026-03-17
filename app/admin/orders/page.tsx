import { db } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import { formatCurrency, formatDate, planDurationLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResendCredentialsButton } from "@/components/admin/resend-button";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

interface SearchParams {
  status?: string;
  store?: string;
  page?: string;
}

const PAGE_SIZE = 20;

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  PAID: "success",
  PENDING: "warning",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
};

async function getOrders(params: SearchParams) {
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};
  if (params.status && Object.values(OrderStatus).includes(params.status as OrderStatus)) {
    where.status = params.status as OrderStatus;
  }
  if (params.store) {
    where.storeId = params.store;
  }

  const [orders, total, stores] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        client: { select: { id: true, name: true, email: true } },
        store: { select: { id: true, name: true } },
        credentials: { where: { isActive: true }, select: { id: true } },
      },
    }),
    db.order.count({ where }),
    db.store.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return { orders, total, stores, page, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { orders, total, stores, page, totalPages } = await getOrders(searchParams);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-muted-foreground mt-1">{total} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {["", ...Object.values(OrderStatus)].map((s) => (
            <Link
              key={s}
              href={`/admin/orders?${new URLSearchParams({ ...(searchParams), status: s, page: "1" }).toString()}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                (searchParams.status ?? "") === s
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
              }`}
            >
              {s === "" ? "All" : s}
            </Link>
          ))}
        </div>

        {/* Store filter */}
        <div className="flex gap-2 flex-wrap">
          {[{ id: "", name: "All Stores" }, ...stores].map((store) => (
            <Link
              key={store.id}
              href={`/admin/orders?${new URLSearchParams({ ...(searchParams), store: store.id, page: "1" }).toString()}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                (searchParams.store ?? "") === store.id
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-gray-600 border-gray-200 hover:border-slate-300"
              }`}
            >
              {store.name}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Client</th>
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
                {orders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-6 py-3">
                      <Link href={`/admin/clients/${order.client.id}`} className="hover:underline">
                        <p className="font-medium">{order.client.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{order.client.email}</p>
                      </Link>
                    </td>
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
                          channel="both"
                          size="sm"
                        />
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/orders?${new URLSearchParams({ ...searchParams, page: String(page - 1) }).toString()}`}
                    className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/orders?${new URLSearchParams({ ...searchParams, page: String(page + 1) }).toString()}`}
                    className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
