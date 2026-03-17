import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewStoreForm } from "@/components/admin/new-store-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewStorePage() {
  return (
    <div className="space-y-6 max-w-xl">
      <Link
        href="/admin/stores"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to stores
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Store</h1>
        <p className="text-muted-foreground mt-1">Set up a new IPTV storefront</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store Details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewStoreForm />
        </CardContent>
      </Card>
    </div>
  );
}
