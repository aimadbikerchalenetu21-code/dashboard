"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";

export function RevokeCredentialButton({ credentialId }: { credentialId: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function revoke() {
    if (!confirm("Are you sure you want to revoke this credential?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/credentials/${credentialId}/revoke`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to revoke");
      toast({ title: "Credential revoked" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Revoke failed",
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
      variant="outline"
      onClick={revoke}
      disabled={loading}
      className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
    >
      <ShieldOff className="w-3 h-3" />
      {loading ? "…" : "Revoke"}
    </Button>
  );
}
