import type { ExtractResponse, JobStatusResponse, ApiError } from "@analyst-platform/shared";

const BASE_URL = "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: `Request failed with status ${response.status}`,
    }));
    throw new Error(error.error);
  }
  return response.json();
}

export async function startExtraction(url: string): Promise<ExtractResponse> {
  const response = await fetch(`${BASE_URL}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return handleResponse<ExtractResponse>(response);
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${BASE_URL}/extract/${jobId}`);
  return handleResponse<JobStatusResponse>(response);
}
