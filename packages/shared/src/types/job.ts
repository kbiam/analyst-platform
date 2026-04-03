import type { Speaker } from "./speaker";

export type JobStatus =
  | "pending"
  | "scraping"
  | "enriching"
  | "completed"
  | "failed";

export interface Job {
  id: string;
  url: string;
  status: JobStatus;
  speakers: Speaker[];
  error?: string;
  createdAt: number;
  completedAt?: number;
  /** Number of speakers enriched so far */
  enrichedCount: number;
  /** Total speakers found */
  totalSpeakers: number;
}

/** SSE event types emitted during extraction */
export type JobEventType =
  | "job_status"
  | "agent_progress"
  | "speakers_found"
  | "speaker_enriched"
  | "speaker_enrichment_failed"
  | "job_complete"
  | "job_error";

export interface JobStatusEvent {
  type: "job_status";
  jobId: string;
  status: JobStatus;
}

export interface AgentProgressEvent {
  type: "agent_progress";
  jobId: string;
  message: string;
}

export interface SpeakersFoundEvent {
  type: "speakers_found";
  jobId: string;
  speakers: Speaker[];
}

export interface SpeakerEnrichedEvent {
  type: "speaker_enriched";
  jobId: string;
  speaker: Speaker;
}

export interface SpeakerEnrichmentFailedEvent {
  type: "speaker_enrichment_failed";
  jobId: string;
  speakerId: string;
  error: string;
}

export interface JobCompleteEvent {
  type: "job_complete";
  jobId: string;
  speakers: Speaker[];
}

export interface JobErrorEvent {
  type: "job_error";
  jobId: string;
  error: string;
}

export type JobEvent =
  | JobStatusEvent
  | AgentProgressEvent
  | SpeakersFoundEvent
  | SpeakerEnrichedEvent
  | SpeakerEnrichmentFailedEvent
  | JobCompleteEvent
  | JobErrorEvent;
