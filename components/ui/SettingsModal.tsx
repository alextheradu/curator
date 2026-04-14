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
      <DialogContent className="max-w-sm border-[#2e2e2e] bg-[#1a1a1a]">
        <DialogHeader>
          <DialogTitle className="text-white">Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Temperature</label>
              <span className="font-mono text-xs text-[#8A8A8A]">{temperature.toFixed(1)}</span>
            </div>
            <Slider min={0} max={1} step={0.1} value={[temperature]}
              onValueChange={([v]) => setTemperature(v)}
              className="[&_[role=slider]]:bg-[#ED1C24] [&_[role=slider]]:border-[#ED1C24]"
            />
            <p className="text-xs text-[#8A8A8A]">Lower = more precise. Higher = more creative.</p>
          </div>

          <div className="space-y-2 border-t border-[#2e2e2e] pt-4">
            <p className="text-sm font-medium text-white">Account</p>
            {session ? (
              <div className="space-y-2">
                <p className="text-xs text-[#8A8A8A]">Signed in as {session.user?.email}</p>
                <Button variant="outline" size="sm"
                  className="w-full border-[#2e2e2e] text-[#8A8A8A] hover:text-white"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <Button size="sm" className="w-full bg-white text-black hover:bg-gray-100"
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
