"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink } from "lucide-react";

interface Props {
  open: boolean;
  onAccept: () => void;
}

export function TosModal({ open, onAccept }: Props) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg border-white/[0.08] bg-[#17191f] [&>button]:hidden"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[var(--foreground)]">
            Accept the terms to start chatting
          </DialogTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Before Curator sends your first message, you need to accept the Terms of Service and Privacy Policy.
          </p>
        </DialogHeader>

        <ScrollArea className="h-48 rounded-2xl border border-white/[0.08] bg-[#111318] p-4">
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
            Curator is a fan-made tool and is <strong className="text-[var(--foreground)]">not affiliated with FIRST®</strong>.
            AI responses may be inaccurate, so verify rules at{" "}
            <a
              href="https://firstinspires.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f0d4a8] underline"
            >
              firstinspires.org
            </a>.
            <br /><br />
            By continuing, you agree to our{" "}
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#f0d4a8] underline"
            >
              Terms of Service <ExternalLink size={10} />
            </a>{" "}and{" "}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#f0d4a8] underline"
            >
              Privacy Policy <ExternalLink size={10} />
            </a>.
            We collect chat messages to generate responses and, if you create an account, store conversation history.
          </p>
        </ScrollArea>

        <DialogFooter>
          <Button
            onClick={onAccept}
            className="w-full rounded-2xl bg-[var(--accent)] text-white hover:bg-[#6895ff]"
          >
            I agree and want to chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
