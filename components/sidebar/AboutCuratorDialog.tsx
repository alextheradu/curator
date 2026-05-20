"use client";

import { ExternalLink, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AboutCuratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRINCIPLES = [
  "Stays focused on FIRST Robotics Competition rather than acting as a general-purpose chatbot.",
  "Avoids guessing - when something can't be verified, the right step is to check the official FIRST source.",
  "Grounds answers in official documents and live event data so teams can verify what they read.",
  "Helps all teams equally without favoring one team or offering an unfair competitive edge.",
  "Gives feedback and guidance on strategy, code, and outreach rather than doing the work directly.",
];

export function AboutCuratorDialog({ open, onOpenChange }: AboutCuratorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[1.75rem] border border-border/60 bg-card/95 p-0 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <div className="border-b border-border/60 px-6 py-5">
          <DialogHeader className="gap-2 text-left">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[#0066B3]/10 text-[#0066B3]">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground">About Curator</DialogTitle>
                <DialogDescription className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  A focused AI assistant for FIRST Robotics Competition teams.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[72vh] space-y-5 overflow-y-auto px-6 py-5">
          <p className="text-[14px] leading-7 text-foreground">
            Curator is built specifically for FRC. It helps teams work through rules questions, game
            manuals, scouting, rankings, event updates, team research, and robot programming topics
            without drifting into unrelated subjects.
          </p>

          <div className="rounded-[1.25rem] border border-border/60 bg-background/50 px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0066B3]">Mission</p>
            <p className="mt-2 text-[13px] leading-6 text-foreground">
              Give every FRC team fast, trustworthy, season-aware help while keeping the work fair,
              grounded, and easy to verify.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0066B3]">How it operates</p>
            {PRINCIPLES.map((principle) => (
              <div
                key={principle}
                className="rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-[13px] leading-6 text-muted-foreground"
              >
                {principle}
              </div>
            ))}
          </div>

          <p className="text-[12px] leading-5 text-muted-foreground/70">
            Curator is not affiliated with FIRST<sup>®</sup>. For authoritative rules and official
            program information, check{" "}
            <a
              href="https://www.firstinspires.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#0066B3] underline underline-offset-4"
            >
              firstinspires.org <ExternalLink className="size-3" />
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
