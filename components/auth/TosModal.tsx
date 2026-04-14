"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
        className="max-w-lg border-[#2e2e2e] bg-[#1a1a1a] [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">
            Welcome to Curator
          </DialogTitle>
          <p className="text-sm text-[#8A8A8A]">
            An AI knowledge base for FRC. Please review and accept our terms before continuing.
          </p>
        </DialogHeader>

        <ScrollArea className="h-48 rounded-lg border border-[#2e2e2e] bg-[#0f0f0f] p-4">
          <p className="text-xs leading-relaxed text-[#8A8A8A]">
            Curator is a fan-made tool and is <strong className="text-white">not affiliated with FIRST®</strong>.
            AI responses may be inaccurate — always verify rules at{" "}
            <a href="https://firstinspires.org" target="_blank" rel="noopener noreferrer" className="text-[#0066B3] underline">
              firstinspires.org
            </a>. Do not rely on Curator for competition-critical decisions.
            <br /><br />
            By continuing, you agree to our{" "}
            <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0066B3] underline">
              Terms of Service <ExternalLink size={10} />
            </a>{" "}and{" "}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0066B3] underline">
              Privacy Policy <ExternalLink size={10} />
            </a>.
            We collect chat messages to generate responses and, if you create an account, store conversation history. We do not sell your data.
          </p>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onAccept} className="w-full bg-[#ED1C24] text-white hover:bg-[#c9151b]">
            I agree — Continue to Curator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
