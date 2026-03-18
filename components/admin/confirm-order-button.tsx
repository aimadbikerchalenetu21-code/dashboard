"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export function ConfirmOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleConfirm() {
    if (!confirm("Mark this order as PAID and deliver credentials to the client?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast({ title: "Order confirmed", description: "Credentials are being delivered." });
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      onClick={handleConfirm}
      disabled={loading}
      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
    >
      <CheckCircle className="w-3 h-3" />
      {loading ? "Processing…" : "Mark Paid"}
    </Button>
  );
}
