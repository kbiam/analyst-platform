"use client";

import { Badge } from "../ui/badge";
import type { JobStatus } from "@analyst-platform/shared";

interface JobStatusBadgeProps {
  status: JobStatus | "idle";
}

const statusConfig: Record<
  JobStatus | "idle",
  { label: string; variant: "default" | "accent" | "success" | "warning" | "destructive" }
> = {
  idle: { label: "Ready", variant: "default" },
  pending: { label: "Starting", variant: "accent" },
  scraping: { label: "Scraping", variant: "accent" },
  enriching: { label: "Enriching", variant: "warning" },
  completed: { label: "Complete", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant}>
      {(status === "scraping" || status === "enriching" || status === "pending") && (
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {config.label}
    </Badge>
  );
}
