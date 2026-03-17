"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function NewStoreForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    domain: "",
    logoUrl: "",
  });

  function handleNameChange(name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setForm({ ...form, name, slug });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create store");
      }
      const store = await res.json();
      toast({ title: "Store created!", description: `${form.name} is ready` });
      router.push(`/admin/stores/${store.id}`);
    } catch (err) {
      toast({
        title: "Creation failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Store Name *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="My IPTV Store"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug *</Label>
        <Input
          id="slug"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          pattern="[a-z0-9-]+"
          title="Lowercase letters, numbers, and hyphens only"
          placeholder="my-iptv-store"
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
      <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
        {loading ? "Creating…" : "Create Store"}
      </Button>
    </form>
  );
}
