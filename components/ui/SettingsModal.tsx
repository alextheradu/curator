"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/store";

export function SettingsModal() {
  const { data: session } = useSession();
  const { settingsOpen, setSettingsOpen, temperature, setTemperature } = useChatStore();

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-sm border-white/[0.08] bg-[#17191f]">
        <DialogHeader>
          <DialogTitle className="text-[var(--foreground)]">Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--foreground)]">Temperature</label>
              <span className="font-mono text-xs text-[var(--muted-foreground)]">
                {temperature.toFixed(1)}
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={[temperature]}
              onValueChange={([value]) => setTemperature(value)}
              className="[&_[role=slider]]:border-[var(--accent)] [&_[role=slider]]:bg-[var(--accent)]"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Lower is tighter and more literal. Higher is looser and more exploratory.
            </p>
          </div>

          <div className="space-y-2 border-t border-white/[0.08] pt-4">
            <p className="text-sm font-medium text-[var(--foreground)]">Account</p>
            {session ? (
              <div className="space-y-2">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Signed in as {session.user?.email}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-white/[0.08] bg-white/[0.03] text-[var(--muted-foreground)] hover:bg-white/[0.06] hover:text-[var(--foreground)]"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="w-full rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#fff8eb]"
                onClick={() => signIn("google", { callbackUrl: "/" })}
              >
                Sign in with Google
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
