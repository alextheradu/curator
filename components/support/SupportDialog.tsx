"use client";

import { LifeBuoy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SupportForm } from "./SupportForm";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[1.75rem] border border-border/60 bg-card/95 p-0 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <div className="border-b border-border/60 px-6 py-5">
          <DialogHeader className="gap-2 text-left">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[#0066B3]/10 text-[#0066B3]">
                <LifeBuoy className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground">Support</DialogTitle>
                <DialogDescription className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Report bugs, request features, or ask account and privacy questions.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>
        <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
          <SupportForm onSuccess={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
