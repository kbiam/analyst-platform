export type {
  Speaker,
  SpeakerEnrichment,
} from "./types/speaker";

export type {
  Job,
  JobStatus,
  JobEventType,
  JobEvent,
  JobStatusEvent,
  AgentProgressEvent,
  SpeakersFoundEvent,
  SpeakerEnrichedEvent,
  SpeakerEnrichmentFailedEvent,
  JobCompleteEvent,
  JobErrorEvent,
} from "./types/job";

export type {
  ExtractRequest,
  ExtractResponse,
  JobStatusResponse,
  ApiError,
} from "./types/api";

export {
  speakerSchema,
  speakerEnrichmentSchema,
  scrapedSpeakerSchema,
  scrapedSpeakersOutputSchema,
} from "./schemas/speaker.schema";
export type {
  ScrapedSpeaker,
  ScrapedSpeakersOutput,
} from "./schemas/speaker.schema";

export {
  extractRequestSchema,
  jobStatusSchema,
} from "./schemas/job.schema";

export { JOB_EVENTS } from "./constants";
