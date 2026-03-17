import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Store, Plus, ExternalLink } from "lucide-react";

async function getStores() {
  return db.store.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true } },
      orders: {
        where: { status: "PAID" },
        select: { amountCents: true },
      },
    },
  });
}

export default async function StoresPage() {
  const stores = await getStores();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-muted-foreground mt-1">{stores.length} storefronts</p>
        </div>
        <Link href="/admin/stores/new">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4" />
            New Store
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stores.map((store) => {
          const revenue = store.orders.reduce((s, o) => s + o.amountCents, 0);
          return (
            <Card key={store.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {store.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Store className="w-5 h-5 text-indigo-600" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{store.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">/{store.slug}</p>
                    </div>
                  </div>
                  <Badge variant={store.isActive ? "success" : "secondary"}>
                    {store.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-2xl font-bold">{store._count.orders}</p>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(revenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/stores/${store.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Manage
                    </Button>
                  </Link>
                  <Link href={`/stores/${store.slug}`} target="_blank">
                    <Button variant="ghost" size="sm" className="gap-1">
                      <ExternalLink className="w-3 h-3" />
                      View
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {stores.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            No stores yet. Create your first storefront.
          </div>
        )}
      </div>
    </div>
  );
}
