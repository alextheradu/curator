"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        className="max-w-lg rounded-2xl border-border/60 bg-card p-0 shadow-[var(--shadow-float)] [&>button]:hidden"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div className="border-b border-border/60 px-6 py-5">
          <DialogHeader className="gap-2 text-left">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Accept the terms to start chatting
            </DialogTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Before Curator sends your first message, you need to accept the Terms of Service and Privacy Policy.
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          <ScrollArea className="h-48 rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Curator is a fan-made tool and is <strong className="text-foreground">not affiliated with FIRST®</strong>.
              AI responses may be inaccurate, so verify rules at{" "}
              <a
                href="https://firstinspires.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                firstinspires.org
              </a>.
              <br /><br />
              By continuing, you agree to our{" "}
              <a
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
              >
                Terms of Service <ExternalLink size={10} />
              </a>{" "}and{" "}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
              >
                Privacy Policy <ExternalLink size={10} />
              </a>.
              We collect chat messages to generate responses and, if you create an account, store conversation history.
            </p>
          </ScrollArea>

          <Button
            onClick={onAccept}
            className="w-full"
          >
            I agree and want to chat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
