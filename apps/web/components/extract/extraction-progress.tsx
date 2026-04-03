"use client";

import type { JobStatus } from "@analyst-platform/shared";
import { JobStatusBadge } from "./job-status-badge";

interface ExtractionProgressProps {
  status: JobStatus | "idle";
  agentMessages: string[];
  totalSpeakers: number;
  enrichedCount: number;
}

export function ExtractionProgress({
  status,
  agentMessages,
  totalSpeakers,
  enrichedCount,
}: ExtractionProgressProps) {
  if (status === "idle") return null;

  const progressPercent =
    status === "completed"
      ? 100
      : status === "enriching" && totalSpeakers > 0
        ? Math.round((enrichedCount / totalSpeakers) * 100)
        : status === "scraping"
          ? 0
          : 0;

  const latestMessage = agentMessages[agentMessages.length - 1];

  return (
    <div className="w-full max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <JobStatusBadge status={status} />
        {status === "enriching" && totalSpeakers > 0 && (
          <span className="text-sm text-muted-foreground">
            {enrichedCount} / {totalSpeakers} speakers enriched
          </span>
        )}
      </div>

      {/* Progress bar */}
      {(status === "scraping" || status === "enriching") && (
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          {status === "scraping" ? (
            <div className="h-full bg-accent rounded-full animate-progress-indeterminate" />
          ) : (
            <div
              className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          )}
        </div>
      )}

      {/* Latest agent message */}
      {latestMessage && status !== "completed" && (
        <p className="text-sm text-muted-foreground truncate">
          {latestMessage}
        </p>
      )}
    </div>
  );
}
