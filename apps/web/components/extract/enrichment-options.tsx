"use client";

import { cn } from "../../lib/utils";

interface EnrichmentOptionsProps {
  linkedinEnabled: boolean;
  onLinkedinChange: (enabled: boolean) => void;
  className?: string;
}

export function EnrichmentOptions({
  linkedinEnabled,
  onLinkedinChange,
  className,
}: EnrichmentOptionsProps) {
  return (
    <div className={cn("flex items-center gap-4 text-sm", className)}>
      <span className="text-muted-foreground font-medium">Enrich:</span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={linkedinEnabled}
          onChange={(e) => onLinkedinChange(e.target.checked)}
          className="rounded border-border accent-accent"
        />
        LinkedIn
      </label>
      <label className="flex items-center gap-1.5 cursor-not-allowed opacity-50">
        <input type="checkbox" disabled className="rounded border-border" />
        <span>Email</span>
        <span className="text-xs text-muted-foreground">(coming soon)</span>
      </label>
    </div>
  );
}
