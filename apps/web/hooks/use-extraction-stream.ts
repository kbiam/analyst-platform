"use client";

import { useReducer, useCallback, useRef } from "react";
import type {
  Speaker,
  JobStatus,
  JobEvent,
} from "@analyst-platform/shared";

interface ExtractionState {
  jobId: string | null;
  status: JobStatus | "idle";
  speakers: Speaker[];
  agentMessages: string[];
  error: string | null;
  isConnected: boolean;
}

type ExtractionAction =
  | { type: "START_JOB"; jobId: string }
  | { type: "SET_STATUS"; status: JobStatus }
  | { type: "AGENT_PROGRESS"; message: string }
  | { type: "SPEAKERS_FOUND"; speakers: Speaker[] }
  | { type: "SPEAKER_ENRICHED"; speaker: Speaker }
  | { type: "SPEAKER_ENRICHMENT_FAILED"; speakerId: string; error: string }
  | { type: "JOB_COMPLETE"; speakers: Speaker[] }
  | { type: "JOB_ERROR"; error: string }
  | { type: "SET_CONNECTED"; connected: boolean }
  | { type: "RESET" };

function extractionReducer(
  state: ExtractionState,
  action: ExtractionAction
): ExtractionState {
  switch (action.type) {
    case "START_JOB":
      return {
        ...state,
        jobId: action.jobId,
        status: "pending",
        speakers: [],
        agentMessages: [],
        error: null,
      };

    case "SET_STATUS":
      return { ...state, status: action.status };

    case "AGENT_PROGRESS":
      return {
        ...state,
        agentMessages: [...state.agentMessages, action.message],
      };

    case "SPEAKERS_FOUND":
      return { ...state, speakers: action.speakers };

    case "SPEAKER_ENRICHED":
      return {
        ...state,
        speakers: state.speakers.map((s) =>
          s.id === action.speaker.id ? action.speaker : s
        ),
      };

    case "SPEAKER_ENRICHMENT_FAILED":
      return {
        ...state,
        speakers: state.speakers.map((s) =>
          s.id === action.speakerId
            ? {
                ...s,
                enrichmentStatus: "failed" as const,
                enrichmentError: action.error,
              }
            : s
        ),
      };

    case "JOB_COMPLETE":
      return { ...state, status: "completed", speakers: action.speakers };

    case "JOB_ERROR":
      return { ...state, status: "failed", error: action.error };

    case "SET_CONNECTED":
      return { ...state, isConnected: action.connected };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

const initialState: ExtractionState = {
  jobId: null,
  status: "idle",
  speakers: [],
  agentMessages: [],
  error: null,
  isConnected: false,
};

export function useExtractionStream() {
  const [state, dispatch] = useReducer(extractionReducer, initialState);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startExtraction = useCallback(async (url: string) => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    dispatch({ type: "RESET" });

    // POST to create the job
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      dispatch({
        type: "JOB_ERROR",
        error: error.error || "Failed to start extraction",
      });
      return;
    }

    const { jobId } = await response.json();
    dispatch({ type: "START_JOB", jobId });

    // Connect to SSE stream
    const eventSource = new EventSource(`/api/extract/${jobId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      dispatch({ type: "SET_CONNECTED", connected: true });
    };

    eventSource.onerror = () => {
      dispatch({ type: "SET_CONNECTED", connected: false });
    };

    // Handle each event type
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
        const event: JobEvent = JSON.parse(e.data);
        handleEvent(event);
      });
    }

    function handleEvent(event: JobEvent) {
      switch (event.type) {
        case "job_status":
          dispatch({ type: "SET_STATUS", status: event.status });
          break;
        case "agent_progress":
          dispatch({ type: "AGENT_PROGRESS", message: event.message });
          break;
        case "speakers_found":
          dispatch({ type: "SPEAKERS_FOUND", speakers: event.speakers });
          break;
        case "speaker_enriched":
          dispatch({ type: "SPEAKER_ENRICHED", speaker: event.speaker });
          break;
        case "speaker_enrichment_failed":
          dispatch({
            type: "SPEAKER_ENRICHMENT_FAILED",
            speakerId: event.speakerId,
            error: event.error,
          });
          break;
        case "job_complete":
          dispatch({ type: "JOB_COMPLETE", speakers: event.speakers });
          cleanup();
          break;
        case "job_error":
          dispatch({ type: "JOB_ERROR", error: event.error });
          cleanup();
          break;
      }
    }

    function cleanup() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      dispatch({ type: "SET_CONNECTED", connected: false });
    }
  }, []);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    dispatch({ type: "RESET" });
  }, []);

  return {
    ...state,
    startExtraction,
    reset,
  };
}
