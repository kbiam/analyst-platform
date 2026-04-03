"use client";

import { useReducer, useCallback, useRef, useMemo } from "react";
import type { Speaker, JobStatus } from "@analyst-platform/shared";

interface SpeakersState {
  status: JobStatus | "idle";
  speakers: Speaker[];
  error: string | null;
}

type SpeakersAction =
  | { type: "SET_STATUS"; status: JobStatus }
  | { type: "SPEAKERS_FOUND"; speakers: Speaker[] }
  | { type: "SPEAKER_ENRICHED"; speaker: Speaker }
  | { type: "SPEAKER_ENRICHMENT_FAILED"; speakerId: string; error: string }
  | { type: "JOB_COMPLETE"; speakers: Speaker[] }
  | { type: "JOB_ERROR"; error: string }
  | { type: "RESET" };

const initialState: SpeakersState = {
  status: "idle",
  speakers: [],
  error: null,
};

function speakersReducer(
  state: SpeakersState,
  action: SpeakersAction
): SpeakersState {
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.status };

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

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

export interface SpeakersCallbacks {
  onSpeakersFound: (speakers: Speaker[]) => void;
  onSpeakerEnriched: (speaker: Speaker) => void;
  onSpeakerEnrichmentFailed: (speakerId: string, error: string) => void;
  onJobComplete: (speakers: Speaker[]) => void;
  onJobError: (error: string) => void;
  onStatusChange: (status: JobStatus) => void;
  onReset: () => void;
}

export function useSpeakersState() {
  const [state, dispatch] = useReducer(speakersReducer, initialState);

  const onSpeakersFound = useCallback(
    (speakers: Speaker[]) => dispatch({ type: "SPEAKERS_FOUND", speakers }),
    []
  );
  const onSpeakerEnriched = useCallback(
    (speaker: Speaker) => dispatch({ type: "SPEAKER_ENRICHED", speaker }),
    []
  );
  const onSpeakerEnrichmentFailed = useCallback(
    (speakerId: string, error: string) =>
      dispatch({ type: "SPEAKER_ENRICHMENT_FAILED", speakerId, error }),
    []
  );
  const onJobComplete = useCallback(
    (speakers: Speaker[]) => dispatch({ type: "JOB_COMPLETE", speakers }),
    []
  );
  const onJobError = useCallback(
    (error: string) => dispatch({ type: "JOB_ERROR", error }),
    []
  );
  const onStatusChange = useCallback(
    (status: JobStatus) => dispatch({ type: "SET_STATUS", status }),
    []
  );
  const onReset = useCallback(() => dispatch({ type: "RESET" }), []);

  // Stable ref for callbacks so the adapter can read the latest without re-renders
  const callbacksRef = useRef<SpeakersCallbacks>({
    onSpeakersFound,
    onSpeakerEnriched,
    onSpeakerEnrichmentFailed,
    onJobComplete,
    onJobError,
    onStatusChange,
    onReset,
  });
  callbacksRef.current = {
    onSpeakersFound,
    onSpeakerEnriched,
    onSpeakerEnrichmentFailed,
    onJobComplete,
    onJobError,
    onStatusChange,
    onReset,
  };

  const callbacks = useMemo<SpeakersCallbacks>(
    () => ({
      onSpeakersFound: (s) => callbacksRef.current.onSpeakersFound(s),
      onSpeakerEnriched: (s) => callbacksRef.current.onSpeakerEnriched(s),
      onSpeakerEnrichmentFailed: (id, err) =>
        callbacksRef.current.onSpeakerEnrichmentFailed(id, err),
      onJobComplete: (s) => callbacksRef.current.onJobComplete(s),
      onJobError: (err) => callbacksRef.current.onJobError(err),
      onStatusChange: (st) => callbacksRef.current.onStatusChange(st),
      onReset: () => callbacksRef.current.onReset(),
    }),
    []
  );

  return { ...state, callbacks };
}
