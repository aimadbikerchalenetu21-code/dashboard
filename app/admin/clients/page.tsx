import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users } from "lucide-react";

const PAGE_SIZE = 20;

async function getClients(page: number) {
  const skip = (page - 1) * PAGE_SIZE;
  const [clients, total] = await Promise.all([
    db.client.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        _count: { select: { orders: true, credentials: true } },
        orders: {
          where: { status: "PAID" },
          select: { amountCents: true, currency: true },
        },
        credentials: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    }),
    db.client.count(),
  ]);
  return { clients, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const { clients, total, totalPages } = await getClients(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-muted-foreground mt-1">{total} registered clients</p>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            All Clients
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Orders</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                    Active Subs
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="font-medium hover:text-indigo-600 hover:underline"
                      >
                        {client.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{client.email}</td>
                    <td className="px-6 py-3 text-muted-foreground">{client.phone ?? "—"}</td>
                    <td className="px-6 py-3">{client._count.orders}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`font-medium ${client.credentials.length > 0 ? "text-green-600" : "text-gray-400"}`}
                      >
                        {client.credentials.length}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {formatDate(client.createdAt)}
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No clients yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/clients?page=${page - 1}`}
                    className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/clients?page=${page + 1}`}
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
