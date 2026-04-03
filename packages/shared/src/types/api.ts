import type { Job } from "./job";

export interface ExtractRequest {
  url: string;
}

export interface ExtractResponse {
  jobId: string;
  status: "pending";
}

export interface JobStatusResponse {
  job: Job;
}

export interface ApiError {
  error: string;
  details?: string;
}
