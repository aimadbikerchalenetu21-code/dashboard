"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

export function StoreEditForm({ store }: { store: Store }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: store.name,
    slug: store.slug,
    domain: store.domain ?? "",
    logoUrl: store.logoUrl ?? "",
    isActive: store.isActive,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update store");
      toast({ title: "Store updated successfully" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">Store Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          pattern="[a-z0-9-]+"
          title="Lowercase letters, numbers, and hyphens only"
          required
        />
        <p className="text-xs text-muted-foreground">
          Store URL: /stores/{form.slug || "…"}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="domain">Custom Domain (optional)</Label>
        <Input
          id="domain"
          value={form.domain}
          onChange={(e) => setForm({ ...form, domain: e.target.value })}
          placeholder="store.example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="logoUrl">Logo URL (optional)</Label>
        <Input
          id="logoUrl"
          value={form.logoUrl}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
          placeholder="https://…"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="isActive">Active (visible to customers)</Label>
      </div>
      <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
        {loading ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
