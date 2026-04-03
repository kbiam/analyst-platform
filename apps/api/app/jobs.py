from __future__ import annotations

import asyncio
import time
from typing import Any

from .models import Job, JobStatus, Speaker, EnrichmentStatus


# In-memory job store
_jobs: dict[str, Job] = {}

# Per-job subscriber queues for SSE
_subscribers: dict[str, list[asyncio.Queue[dict[str, Any] | None]]] = {}


def create_job(job_id: str, url: str) -> Job:
    job = Job(
        id=job_id,
        url=url,
        status=JobStatus.pending,
        speakers=[],
        created_at=time.time() * 1000,  # ms timestamp like JS Date.now()
        enriched_count=0,
        total_speakers=0,
    )
    _jobs[job_id] = job
    _subscribers[job_id] = []
    return job


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


def update_status(job_id: str, status: JobStatus) -> None:
    job = _jobs.get(job_id)
    if not job:
        return
    job.status = status
    if status in (JobStatus.completed, JobStatus.failed):
        job.completed_at = time.time() * 1000


def set_speakers(job_id: str, speakers: list[Speaker]) -> None:
    job = _jobs.get(job_id)
    if not job:
        return
    job.speakers = speakers
    job.total_speakers = len(speakers)


def update_speaker(job_id: str, speaker: Speaker) -> None:
    job = _jobs.get(job_id)
    if not job:
        return
    for i, s in enumerate(job.speakers):
        if s.id == speaker.id:
            job.speakers[i] = speaker
            break
    job.enriched_count = sum(
        1
        for s in job.speakers
        if s.enrichment_status in (EnrichmentStatus.enriched, EnrichmentStatus.failed)
    )


def set_error(job_id: str, error: str) -> None:
    job = _jobs.get(job_id)
    if not job:
        return
    job.error = error
    job.status = JobStatus.failed
    job.completed_at = time.time() * 1000


def subscribe(job_id: str) -> asyncio.Queue[dict[str, Any] | None]:
    queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
    if job_id not in _subscribers:
        _subscribers[job_id] = []
    _subscribers[job_id].append(queue)
    return queue


def unsubscribe(job_id: str, queue: asyncio.Queue[dict[str, Any] | None]) -> None:
    if job_id in _subscribers:
        try:
            _subscribers[job_id].remove(queue)
        except ValueError:
            pass


async def emit(job_id: str, event: dict[str, Any]) -> None:
    if job_id not in _subscribers:
        return
    for queue in _subscribers[job_id]:
        await queue.put(event)
