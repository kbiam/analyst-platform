from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


def _camel_alias(field_name: str) -> str:
    """Convert snake_case to camelCase for JSON serialization."""
    parts = field_name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


_camel_config = ConfigDict(populate_by_name=True, alias_generator=_camel_alias)


class EnrichmentStatus(str, Enum):
    pending = "pending"
    enriching = "enriching"
    enriched = "enriched"
    failed = "failed"


class JobStatus(str, Enum):
    pending = "pending"
    scraping = "scraping"
    enriching = "enriching"
    completed = "completed"
    failed = "failed"


class Speaker(BaseModel):
    model_config = _camel_config

    id: str
    name: str
    title: Optional[str] = None
    company: Optional[str] = None
    linkedin_url: Optional[str] = None
    headline: Optional[str] = None
    enriched_role: Optional[str] = None
    enriched_company: Optional[str] = None
    enrichment_status: EnrichmentStatus = EnrichmentStatus.pending
    enrichment_error: Optional[str] = None


class Job(BaseModel):
    model_config = _camel_config

    id: str
    url: str
    status: JobStatus = JobStatus.pending
    speakers: list[Speaker] = []
    error: Optional[str] = None
    created_at: float
    completed_at: Optional[float] = None
    enriched_count: int = 0
    total_speakers: int = 0


# --- Request / Response ---


class ExtractRequest(BaseModel):
    url: str


class ExtractResponse(BaseModel):
    model_config = _camel_config

    job_id: str
    status: str = "pending"


class JobStatusResponse(BaseModel):
    job: Job


# --- SSE Event payloads ---


class JobStatusEvent(BaseModel):
    model_config = _camel_config

    type: str = "job_status"
    job_id: str
    status: JobStatus


class AgentProgressEvent(BaseModel):
    model_config = _camel_config

    type: str = "agent_progress"
    job_id: str
    message: str


class SpeakersFoundEvent(BaseModel):
    model_config = _camel_config

    type: str = "speakers_found"
    job_id: str
    speakers: list[Speaker]


class SpeakerEnrichedEvent(BaseModel):
    model_config = _camel_config

    type: str = "speaker_enriched"
    job_id: str
    speaker: Speaker


class SpeakerEnrichmentFailedEvent(BaseModel):
    model_config = _camel_config

    type: str = "speaker_enrichment_failed"
    job_id: str
    speaker_id: str
    error: str


class JobCompleteEvent(BaseModel):
    model_config = _camel_config

    type: str = "job_complete"
    job_id: str
    speakers: list[Speaker]


class JobErrorEvent(BaseModel):
    model_config = _camel_config

    type: str = "job_error"
    job_id: str
    error: str
