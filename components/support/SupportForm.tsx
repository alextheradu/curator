"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SUBJECTS = [
  "Bug report",
  "Support request",
  "Feature request",
  "Account issue",
  "Privacy question",
];

interface SupportFormProps {
  onSuccess?: () => void;
}

export function SupportForm({ onSuccess }: SupportFormProps = {}) {
  const { data: session } = useSession();
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [name, setName] = useState(session?.user?.name ?? "");
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (message.trim().length < 20) {
      toast.error("Please include a bit more detail so the request is actionable.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          name,
          email,
          message,
          pagePath: window.location.pathname,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? "Support request failed");
      }

      setMessage("");
      toast.success("Support request sent.");
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Support request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Name
          </span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </label>
        <label className="space-y-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Email
          </span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Subject
        </span>
        <select
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {SUBJECTS.map((option) => (
            <option key={option} value={option} className="bg-[#111318] text-foreground">
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Message
        </span>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="What happened, what you expected, and any relevant context."
          className="min-h-40 resize-y"
        />
      </label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-[12px] leading-5 text-muted-foreground">
          This form is rate-limited and stores the message, contact details you provide, and basic request metadata so the operator can respond and debug issues.
        </p>
        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? "Sending..." : "Send request"}
        </Button>
      </div>
    </form>
  );
}
