from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass
from typing import Optional

import requests

log = logging.getLogger(__name__)

EXA_API_URL = "https://api.exa.ai/search"


@dataclass
class SpeakerEnrichment:
    linkedin_url: str


def _get_api_key() -> str:
    key = os.environ.get("EXA_API_KEY")
    if not key:
        raise RuntimeError("EXA_API_KEY environment variable is not set")
    return key


def _search_linkedin(name: str, company: str | None) -> str | None:
    """Search for a person's LinkedIn profile using Exa API (blocking)."""
    query_parts = [name]
    if company:
        query_parts.append(company)
    query = " ".join(query_parts)

    headers = {
        "x-api-key": _get_api_key(),
        "Content-Type": "application/json",
    }
    payload = {
        "query": query,
        "type": "auto",
        "num_results": 1,
        "category": "people",
        "includeDomains": ["linkedin.com"],
    }

    log.info("Exa search: %s", query)
    response = requests.post(EXA_API_URL, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()

    if data.get("results") and len(data["results"]) > 0:
        url = data["results"][0].get("url")
        log.info("  -> Found: %s", url)
        return url

    log.info("  -> Not found")
    return None


async def enrich_speaker(
    name: str,
    title: Optional[str] = None,
    company: Optional[str] = None,
) -> SpeakerEnrichment | None:
    """Search for a speaker's LinkedIn profile via Exa."""
    # Run blocking requests call in thread pool
    url = await asyncio.to_thread(_search_linkedin, name, company)
    if not url:
        return None
    return SpeakerEnrichment(linkedin_url=url)
