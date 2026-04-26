"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  PROJECT_COLORS,
  PROJECT_ICONS,
  sanitizeProjectInput,
  type Project,
} from "@/lib/projects";
import { cn } from "@/lib/utils";
import { getProjectColorClass, ProjectIcon } from "./projectVisuals";

type ProjectDialogProps = {
  open: boolean;
  project?: Project | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { name: string; icon: string; color: string }) => Promise<void>;
};

export function ProjectDialog({ open, project = null, onOpenChange, onSubmit }: ProjectDialogProps) {
  const [name, setName] = useState(project?.name ?? "New project");
  const [icon, setIcon] = useState(project?.icon ?? DEFAULT_PROJECT_ICON);
  const [color, setColor] = useState(project?.color ?? DEFAULT_PROJECT_COLOR);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    const payload = sanitizeProjectInput({ name, icon, color });
    setIsSaving(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Unable to save this project right now.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl border border-border/60 bg-card p-0 text-card-foreground shadow-[var(--shadow-float)] sm:max-w-[460px]">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            Choose how this project appears in your sidebar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Name</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={64}
              className="h-10 rounded-xl"
            />
          </label>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Icon</p>
            <div className="grid grid-cols-5 gap-2">
              {PROJECT_ICONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  onClick={() => setIcon(item.key)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    icon === item.key && "border-foreground/40 bg-muted text-foreground"
                  )}
                >
                  <ProjectIcon icon={item.key} className="size-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Color</p>
            <div className="grid grid-cols-6 gap-2">
              {PROJECT_COLORS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  onClick={() => setColor(item.key)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl ring-1 transition-transform hover:scale-105",
                    getProjectColorClass(item.key),
                    color === item.key && "outline outline-2 outline-offset-2 outline-foreground/45"
                  )}
                >
                  <span className="size-3 rounded-full bg-current" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-5 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isSaving}>
            {project ? "Save changes" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
