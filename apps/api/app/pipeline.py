from __future__ import annotations

import asyncio
import logging
import uuid

from .models import Speaker, JobStatus, EnrichmentStatus
from . import jobs
from .scraper import scrape_speakers
from .enrichment import enrich_speaker

log = logging.getLogger(__name__)

# Rate limit delay between Exa requests (seconds)
ENRICHMENT_DELAY = 0.5


async def run_extraction_pipeline(job_id: str) -> None:
    """Orchestrate: scrape speakers → enrich with LinkedIn data → emit SSE events."""

    log.info("Pipeline started for job %s", job_id)

    try:
        # Phase 1: Scrape
        jobs.update_status(job_id, JobStatus.scraping)
        await jobs.emit(job_id, {
            "type": "job_status",
            "jobId": job_id,
            "status": "scraping",
        })

        job = jobs.get_job(job_id)
        if not job:
            raise RuntimeError(f"Job {job_id} not found")

        log.info("Phase 1: Scraping %s", job.url)

        async def on_progress(message: str) -> None:
            log.info("  [agent] %s", message)
            await jobs.emit(job_id, {
                "type": "agent_progress",
                "jobId": job_id,
                "message": message,
            })

        scraped = await scrape_speakers(job.url, on_progress=on_progress)

        # Convert scraped dicts to Speaker models
        speakers = [
            Speaker(
                id=str(uuid.uuid4()),
                name=s["name"],
                title=s.get("title"),
                company=s.get("company"),
                enrichment_status=EnrichmentStatus.pending,
            )
            for s in scraped
        ]

        jobs.set_speakers(job_id, speakers)
        log.info("Phase 1 complete: %d speakers found", len(speakers))

        await jobs.emit(job_id, {
            "type": "speakers_found",
            "jobId": job_id,
            "speakers": [
                s.model_dump(by_alias=True) for s in speakers
            ],
        })

        # Phase 2: Enrich (sequentially to respect rate limits)
        jobs.update_status(job_id, JobStatus.enriching)
        await jobs.emit(job_id, {
            "type": "job_status",
            "jobId": job_id,
            "status": "enriching",
        })

        log.info("Phase 2: Enriching %d speakers via Exa", len(speakers))

        for i, speaker in enumerate(speakers):
            speaker.enrichment_status = EnrichmentStatus.enriching
            log.info("[%d/%d] Enriching: %s at %s", i + 1, len(speakers), speaker.name, speaker.company or "?")

            try:
                enrichment = await enrich_speaker(
                    speaker.name,
                    speaker.title,
                    speaker.company,
                )

                if enrichment:
                    speaker.linkedin_url = enrichment.linkedin_url
                    speaker.enrichment_status = EnrichmentStatus.enriched
                    log.info("  -> LinkedIn: %s", enrichment.linkedin_url)
                else:
                    speaker.enrichment_status = EnrichmentStatus.failed
                    speaker.enrichment_error = "No LinkedIn profile found"
                    log.info("  -> Not found")

                jobs.update_speaker(job_id, speaker)

                await jobs.emit(job_id, {
                    "type": "speaker_enriched",
                    "jobId": job_id,
                    "speaker": speaker.model_dump(by_alias=True),
                })

            except Exception as e:
                speaker.enrichment_status = EnrichmentStatus.failed
                speaker.enrichment_error = str(e)
                log.error("  -> Error: %s", e)

                jobs.update_speaker(job_id, speaker)

                await jobs.emit(job_id, {
                    "type": "speaker_enrichment_failed",
                    "jobId": job_id,
                    "speakerId": speaker.id,
                    "error": speaker.enrichment_error,
                })

            # Rate limit between requests
            await asyncio.sleep(ENRICHMENT_DELAY)

        # Complete
        jobs.update_status(job_id, JobStatus.completed)

        final_job = jobs.get_job(job_id)
        enriched_count = sum(1 for s in (final_job.speakers if final_job else []) if s.enrichment_status == EnrichmentStatus.enriched)
        log.info("Pipeline complete for job %s: %d/%d enriched", job_id, enriched_count, len(speakers))

        await jobs.emit(job_id, {
            "type": "job_complete",
            "jobId": job_id,
            "speakers": [
                s.model_dump(by_alias=True) for s in (final_job.speakers if final_job else [])
            ],
        })

    except Exception as e:
        error_message = str(e)
        jobs.set_error(job_id, error_message)
        log.error("Pipeline failed for job %s: %s", job_id, error_message)

        await jobs.emit(job_id, {
            "type": "job_error",
            "jobId": job_id,
            "error": error_message,
        })
