from __future__ import annotations

import json
import logging
import os
import uuid
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load .env from the api directory (parent of app/)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .models import ExtractRequest
from . import jobs
from .pipeline import run_extraction_pipeline

log = logging.getLogger(__name__)

app = FastAPI(title="Analyst Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/extract", status_code=201)
async def start_extraction(
    request: ExtractRequest,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    job_id = str(uuid.uuid4())
    log.info("New extraction job %s for URL: %s", job_id, request.url)
    jobs.create_job(job_id, request.url)
    background_tasks.add_task(run_extraction_pipeline, job_id)
    return {"jobId": job_id, "status": "pending"}


@app.get("/api/extract/{job_id}")
async def get_job_status(job_id: str) -> dict[str, Any]:
    job = jobs.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job": job.model_dump(by_alias=True)}


@app.get("/api/extract/{job_id}/stream")
async def stream_events(job_id: str) -> StreamingResponse:
    job = jobs.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    log.info("SSE client connected for job %s", job_id)
    queue = jobs.subscribe(job_id)

    async def event_generator():
        try:
            # Send current state as first event
            yield _sse("job_status", {
                "type": "job_status",
                "jobId": job_id,
                "status": job.status.value,
            })

            # If job already has speakers, send them
            if job.speakers:
                yield _sse("speakers_found", {
                    "type": "speakers_found",
                    "jobId": job_id,
                    "speakers": [s.model_dump(by_alias=True) for s in job.speakers],
                })

            # If job is already terminal, send final event and close
            if job.status in ("completed", "failed"):
                if job.status == "completed":
                    yield _sse("job_complete", {
                        "type": "job_complete",
                        "jobId": job_id,
                        "speakers": [s.model_dump(by_alias=True) for s in job.speakers],
                    })
                else:
                    yield _sse("job_error", {
                        "type": "job_error",
                        "jobId": job_id,
                        "error": job.error or "Unknown error",
                    })
                return

            # Stream live events from queue
            while True:
                event = await queue.get()
                if event is None:
                    break
                event_type = event.get("type", "message")
                yield _sse(event_type, event)

                if event_type in ("job_complete", "job_error"):
                    break
        finally:
            jobs.unsubscribe(job_id, queue)
            log.info("SSE client disconnected for job %s", job_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        },
    )


def _sse(event_type: str, data: dict[str, Any]) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
