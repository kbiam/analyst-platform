from __future__ import annotations

import json
import logging
import shutil
import tempfile
from pathlib import Path
from typing import Callable, Awaitable, Optional

from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, TextBlock, ToolUseBlock

log = logging.getLogger(__name__)

OUTPUT_FILENAME = "speakers.json"

SCRAPER_SYSTEM_PROMPT = """You are a web scraping agent that extracts speaker information from event/conference pages.

You have Chrome DevTools MCP tools AND a scratch pad directory (your cwd). You can save files, write scripts, and run bash commands freely.

## Strategy

1. **Navigate** to the provided URL using navigate_page
2. **Wait** a few seconds for the page to fully load and fire API requests
3. **Inspect network traffic** using list_network_requests (filter by resourceTypes: ["XHR", "Fetch"])
4. **Save interesting network responses to files** — use get_network_request to read response bodies, then WRITE them to .json or .txt files in your scratch pad so you can process them
5. **Analyze the saved data** — use Bash (grep, jq, python, etc.) to find patterns, extract speaker arrays, and understand the data structure
6. **Write a deterministic parser** — once you understand the structure, write a small Python or bash script that extracts speakers from the saved data files
7. **Run the parser** and write the final output to `speakers.json`

## Fallback

If no useful API responses are found (e.g. the page is server-rendered HTML):
1. Use take_snapshot to get the accessibility tree
2. Save the snapshot to a file
3. Parse speaker info from it using grep/python/etc.

## Output

Write a file called `speakers.json` in your working directory with this format:
{
  "speakers": [
    { "name": "Jane Smith", "title": "VP Engineering", "company": "Acme Corp" }
  ]
}

Each speaker must have "name" (required), "title" (optional), "company" (optional).

## Important
- ALWAYS save network responses to files first, then process them — don't try to work with large data inline
- Use bash tools (grep, jq, python) to parse data — write small scripts when the data structure is complex
- Your scratch pad is your working directory — save anything you need there
- Only include actual speakers/presenters, not organizers or sponsors (unless they are also speaking)
- The final output MUST be in `speakers.json` — this is what gets read by the system"""


def _build_scrape_prompt(url: str, scratch_dir: str) -> str:
    return f"""Extract all speakers from this event page: {url}

Your scratch pad directory is: {scratch_dir}
Write all intermediate files and the final output there.

Steps:
1. Navigate to the URL
2. Wait for the page to load
3. Use list_network_requests (resourceTypes: ["XHR", "Fetch"]) to find API responses with speaker data
4. Save promising network response bodies to files (e.g. response_1.json)
5. Inspect the saved files with bash (grep, jq, head, etc.) to understand the structure
6. Write a small script to extract speakers from the data
7. Run the script and write the result to speakers.json

If no API data is found, use take_snapshot, save to a file, and parse it.

Final output must be in: {scratch_dir}/speakers.json
Format:
{{
  "speakers": [
    {{ "name": "string (required)", "title": "string (optional)", "company": "string (optional)" }}
  ]
}}"""


async def scrape_speakers(
    url: str,
    on_progress: Optional[Callable[[str], Awaitable[None]]] = None,
) -> list[dict]:
    """Use Claude Agent SDK + Chrome DevTools MCP to scrape speakers from a URL."""

    # Create a temp scratch pad directory for the agent
    scratch_dir = tempfile.mkdtemp(prefix="analyst_scrape_")
    log.info("Starting scrape for URL: %s (scratch: %s)", url, scratch_dir)

    try:
        options = ClaudeAgentOptions(
            model="claude-sonnet-4-5-20250929",
            system_prompt=SCRAPER_SYSTEM_PROMPT,
            permission_mode="bypassPermissions",
            cwd=scratch_dir,
            mcp_servers={
                "chrome-devtools": {
                    "type": "stdio",
                    "command": "npx",
                    "args": ["-y", "chrome-devtools-mcp@latest", "--headless", "--isolated"],
                },
            },
            max_turns=30,
            max_buffer_size=10 * 1024 * 1024,  # 10MB
        )

        prompt = _build_scrape_prompt(url, scratch_dir)

        if on_progress:
            await on_progress("Starting browser agent...")

        turn_count = 0

        async for message in query(prompt=prompt, options=options):
            if isinstance(message, AssistantMessage):
                turn_count += 1
                for block in message.content:
                    if isinstance(block, TextBlock):
                        log.debug("Agent text (turn %d): %s", turn_count, block.text[:200])
                    elif isinstance(block, ToolUseBlock):
                        log.info("Agent tool call (turn %d): %s", turn_count, block.name)
                        if on_progress:
                            await on_progress(f"Agent using tool: {block.name}")

        log.info("Agent finished after %d turns", turn_count)

        if on_progress:
            await on_progress("Reading extracted speakers...")

        # Read the output file the agent wrote
        output_path = Path(scratch_dir) / OUTPUT_FILENAME
        if not output_path.exists():
            # List what the agent did create for debugging
            files = list(Path(scratch_dir).iterdir())
            log.error("No speakers.json found. Scratch pad contains: %s", [f.name for f in files])
            raise FileNotFoundError(
                f"Agent did not create {OUTPUT_FILENAME}. "
                f"Scratch pad files: {[f.name for f in files]}"
            )

        raw = output_path.read_text()
        log.info("Read speakers.json (%d bytes)", len(raw))
        parsed = json.loads(raw)
        speakers = parsed.get("speakers", [])

        # Validate each speaker has at least a name
        validated = []
        for s in speakers:
            if isinstance(s, dict) and s.get("name"):
                validated.append(
                    {
                        "name": s["name"],
                        "title": s.get("title"),
                        "company": s.get("company"),
                    }
                )

        log.info("Scraped %d speakers from %s", len(validated), url)

        if on_progress:
            await on_progress(f"Found {len(validated)} speakers")

        return validated

    finally:
        # Clean up scratch pad
        shutil.rmtree(scratch_dir, ignore_errors=True)
        log.info("Cleaned up scratch pad: %s", scratch_dir)
