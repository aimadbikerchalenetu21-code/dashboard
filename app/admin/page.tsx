import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
import { OrderStatus } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Key,
  TrendingUp,
  Store,
} from "lucide-react";

async function getStats() {
  const [
    totalOrders,
    paidOrders,
    totalClients,
    activeCredentials,
    totalStores,
    recentOrders,
    revenueResult,
  ] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { status: OrderStatus.PAID } }),
    db.client.count(),
    db.credential.count({ where: { isActive: true } }),
    db.store.count(),
    db.order.findMany({
      where: { status: OrderStatus.PAID },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        client: { select: { name: true, email: true } },
        store: { select: { name: true } },
      },
    }),
    db.order.aggregate({
      where: { status: OrderStatus.PAID },
      _sum: { amountCents: true },
    }),
  ]);

  return {
    totalOrders,
    paidOrders,
    totalClients,
    activeCredentials,
    totalStores,
    recentOrders,
    totalRevenueCents: revenueResult._sum.amountCents ?? 0,
  };
}

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  PAID: "success",
  PENDING: "warning",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
};

export default async function AdminOverviewPage() {
  const stats = await getStats();

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenueCents),
      sub: `${stats.paidOrders} paid orders`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      sub: `${stats.paidOrders} completed`,
      icon: ShoppingCart,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Total Clients",
      value: stats.totalClients.toString(),
      sub: "registered users",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Active Subscriptions",
      value: stats.activeCredentials.toString(),
      sub: "active credentials",
      icon: Key,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Stores",
      value: stats.totalStores.toString(),
      sub: "active storefronts",
      icon: Store,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back, here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Recent Orders
          </CardTitle>
          <Link href="/admin/orders" className="text-sm text-indigo-600 hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Store</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium">{order.client.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{order.client.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{order.store.name}</td>
                    <td className="px-6 py-3">{order.planName}</td>
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
                {stats.recentOrders.length === 0 && (
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
