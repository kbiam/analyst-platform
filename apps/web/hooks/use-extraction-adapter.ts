"use client";

import { useMemo } from "react";
import type { ChatModelAdapter } from "@assistant-ui/react";
import type { JobEvent } from "@analyst-platform/shared";
import type { SpeakersCallbacks } from "./use-speakers-state";

function getTextFromMessage(messages: readonly { role: string; content: readonly { type: string; text?: string }[] }[]): string {
  const last = messages[messages.length - 1];
  if (!last) return "";
  const textPart = last.content.find((p) => p.type === "text");
  return textPart?.text?.trim() ?? "";
}

function createExtractionAdapter(
  callbacksRef: { current: SpeakersCallbacks },
  enrichLinkedin: { current: boolean }
): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const userText = getTextFromMessage(messages as any);

      // Try to extract a URL from the message
      let url: string;
      try {
        const match = userText.match(/https?:\/\/[^\s]+/);
        url = match ? match[0] : userText;
        new URL(url); // validate
      } catch {
        yield {
          content: [
            {
              type: "text" as const,
              text: "Please provide a valid URL to extract speakers from.",
            },
          ],
        };
        return;
      }

      const callbacks = callbacksRef.current;
      callbacks.onReset();

      // POST to create the job
      let jobId: string;
      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            options: { enrichLinkedin: enrichLinkedin.current },
          }),
          signal: abortSignal,
        });

        if (!response.ok) {
          const error = await response.json();
          callbacks.onJobError(error.error || "Failed to start extraction");
          yield {
            content: [
              { type: "text" as const, text: `Error: ${error.error || "Failed to start extraction"}` },
            ],
          };
          return;
        }

        const data = await response.json();
        jobId = data.jobId;
      } catch (e: any) {
        if (e.name === "AbortError") {
          yield { content: [{ type: "text" as const, text: "Extraction cancelled." }] };
          return;
        }
        callbacks.onJobError(e.message);
        yield { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
        return;
      }

      callbacks.onStatusChange("pending");

      // Show a simple status while working — the Thread renders a
      // "Thinking..." indicator for running messages, so we only need
      // to yield the *current* short status line (not a growing log).
      let statusLine = "Connecting...";
      yield {
        content: [{ type: "text" as const, text: statusLine }],
      };

      // Connect to SSE stream
      const eventSource = new EventSource(`/api/extract/${jobId}/stream`);
      let done = false;

      // Clean up on abort
      const onAbort = () => {
        eventSource.close();
        done = true;
      };
      abortSignal.addEventListener("abort", onAbort);

      try {
        // Convert EventSource into async iteration via a queue
        const queue: JobEvent[] = [];
        let resolve: (() => void) | null = null;

        function enqueue(event: JobEvent) {
          queue.push(event);
          if (resolve) {
            resolve();
            resolve = null;
          }
        }

        const eventTypes = [
          "job_status",
          "agent_progress",
          "speakers_found",
          "speaker_enriched",
          "speaker_enrichment_failed",
          "job_complete",
          "job_error",
        ];

        for (const eventType of eventTypes) {
          eventSource.addEventListener(eventType, (e: MessageEvent) => {
            try {
              const event: JobEvent = JSON.parse(e.data);
              enqueue(event);
            } catch {
              // skip malformed events
            }
          });
        }

        eventSource.onerror = () => {
          if (!done) {
            enqueue({ type: "job_error", jobId, error: "Connection lost" } as JobEvent);
          }
        };

        // Collect summary for the final message
        let speakerCount = 0;
        let enrichedCount = 0;

        while (!done) {
          // Wait for next event
          if (queue.length === 0) {
            await new Promise<void>((r) => {
              resolve = r;
            });
          }

          while (queue.length > 0) {
            const event = queue.shift()!;

            switch (event.type) {
              case "job_status":
                callbacks.onStatusChange(event.status);
                if (event.status === "scraping") {
                  statusLine = "Scraping page...";
                  yield { content: [{ type: "text" as const, text: statusLine }] };
                } else if (event.status === "enriching") {
                  statusLine = "Enriching speakers...";
                  yield { content: [{ type: "text" as const, text: statusLine }] };
                }
                break;

              case "agent_progress":
                // Show the latest agent message as the status line
                statusLine = event.message;
                yield { content: [{ type: "text" as const, text: statusLine }] };
                break;

              case "speakers_found":
                callbacks.onSpeakersFound(event.speakers);
                speakerCount = event.speakers.length;
                statusLine = `Found ${speakerCount} speakers. Enriching...`;
                yield { content: [{ type: "text" as const, text: statusLine }] };
                break;

              case "speaker_enriched":
                callbacks.onSpeakerEnriched(event.speaker);
                enrichedCount++;
                statusLine = `Enriching speakers... (${enrichedCount}/${speakerCount})`;
                yield { content: [{ type: "text" as const, text: statusLine }] };
                break;

              case "speaker_enrichment_failed":
                callbacks.onSpeakerEnrichmentFailed(
                  event.speakerId,
                  event.error
                );
                enrichedCount++;
                break;

              case "job_complete":
                callbacks.onJobComplete(event.speakers);
                done = true;
                // Final summary message (replaces the running status)
                yield {
                  content: [{
                    type: "text" as const,
                    text: `Done! Extracted ${event.speakers.length} speakers from this page.`,
                  }],
                };
                break;

              case "job_error":
                callbacks.onJobError(event.error);
                done = true;
                yield {
                  content: [{ type: "text" as const, text: `Extraction failed: ${event.error}` }],
                };
                break;
            }
          }
        }
      } finally {
        abortSignal.removeEventListener("abort", onAbort);
        eventSource.close();
      }
    },
  };
}

export function useExtractionAdapter(
  callbacks: SpeakersCallbacks,
  enrichLinkedin: boolean
) {
  // Use refs so the adapter always has the latest callbacks/options
  // without causing the adapter identity to change
  const callbacksRef = useMemo(
    () => ({ current: callbacks }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  callbacksRef.current = callbacks;

  const enrichRef = useMemo(
    () => ({ current: enrichLinkedin }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  enrichRef.current = enrichLinkedin;

  const adapter = useMemo(
    () => createExtractionAdapter(callbacksRef, enrichRef),
    [callbacksRef, enrichRef]
  );

  return adapter;
}
