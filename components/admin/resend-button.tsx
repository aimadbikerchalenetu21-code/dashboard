"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, Mail, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ResendCredentialsButtonProps {
  credentialId: string;
  channel?: "email" | "whatsapp" | "both";
  size?: "default" | "sm";
}

export function ResendCredentialsButton({
  credentialId,
  channel,
  size = "default",
}: ResendCredentialsButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function resend(ch: "email" | "whatsapp" | "both") {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId, channel: ch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to resend");
      toast({ title: "Credentials resent", description: `Delivered via ${ch}` });
    } catch (err) {
      toast({
        title: "Resend failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (channel) {
    return (
      <Button
        size={size}
        variant="outline"
        onClick={() => resend(channel)}
        disabled={loading}
        className="gap-1.5"
      >
        <Send className="w-3 h-3" />
        {loading ? "Sending…" : "Resend"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant="outline" disabled={loading} className="gap-1.5">
          <Send className="w-3 h-3" />
          {loading ? "Sending…" : "Resend"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => resend("email")} className="gap-2 cursor-pointer">
          <Mail className="w-4 h-4" />
          Send via Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => resend("whatsapp")} className="gap-2 cursor-pointer">
          <MessageCircle className="w-4 h-4" />
          Send via WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => resend("both")} className="gap-2 cursor-pointer">
          <Send className="w-4 h-4" />
          Send Both
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
