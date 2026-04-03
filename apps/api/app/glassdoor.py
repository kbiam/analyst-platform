"""
Glassdoor Review Scraper using nodriver

Requirements:
    uv pip install nodriver

Usage:
    python -m app.glassdoor -u "https://www.glassdoor.co.in/Reviews/Amazon-Reviews-E6036.htm" -l 10
    python -m app.glassdoor -u "..." --sort most_recent --min-rating 1 --max-rating 3 -l 50
    python -m app.glassdoor -u "..." --date-from 2024-01-01 --date-to 2024-12-31
    python -m app.glassdoor -u "..." --headless -l 200
"""

import csv
import asyncio
import signal
import sys
import re
from argparse import ArgumentParser
from datetime import datetime
from urllib.parse import urlparse, urlencode, urlunparse, parse_qs

import nodriver as uc

DEFAULT_LIMIT = 100

SORT_OPTIONS = {
    "most_recent": "RD",
    "highest_rating": "RO",
    "lowest_rating": "RL",
    "most_helpful": "MH",
}

SUB_RATING_SELECTORS = {
    "work_life_balance": [
        "[data-test='work-life-balance']",
        "[class*='workLifeBalance']",
    ],
    "culture_values": [
        "[data-test='culture-values']",
        "[class*='cultureValues']",
    ],
    "diversity_inclusion": [
        "[data-test='diversity-inclusion']",
        "[class*='diversityInclusion']",
    ],
    "career_opportunities": [
        "[data-test='career-opportunities']",
        "[class*='careerOpportunities']",
    ],
    "comp_benefits": [
        "[data-test='comp-benefits']",
        "[class*='compBenefits']",
    ],
    "senior_management": [
        "[data-test='senior-management']",
        "[class*='seniorManagement']",
    ],
}

# Global state for signal handler
_browser = None
_reviews_collected = []
_output_file = None


def _signal_handler(sig, frame):
    """Handle Ctrl+C: save partial results and exit."""
    print(f"\n\nInterrupted! Saving {len(_reviews_collected)} reviews collected so far...")
    if _reviews_collected and _output_file:
        _write_csv(_reviews_collected, _output_file)
        print(f"Partial results saved to {_output_file}")
    if _browser:
        _browser.stop()
    sys.exit(1)


signal.signal(signal.SIGINT, _signal_handler)


def _build_url(base_url, sort=None):
    """Apply sort filter to Glassdoor URL via query params."""
    parsed = urlparse(base_url)
    params = parse_qs(parsed.query)

    if sort and sort in SORT_OPTIONS:
        params["sort.sortType"] = [SORT_OPTIONS[sort]]

    new_query = urlencode(params, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


def _extract_company_name(url):
    """Extract company name from Glassdoor URL for auto-naming output file."""
    match = re.search(r"/Reviews/(.+?)-Reviews", url)
    if match:
        return match.group(1).replace("-", "_").lower()
    return "glassdoor"


def _parse_review_date(date_str):
    """Parse Glassdoor date strings into datetime objects.

    Handles formats like 'Jan 15, 2024', 'January 15, 2024', '15 Jan 2024'.
    Returns None if parsing fails.
    """
    if not date_str:
        return None
    # Strip common prefixes
    cleaned = re.sub(r"^(Reviewed|Posted|Written)\s+", "", date_str.strip(), flags=re.IGNORECASE)
    cleaned = cleaned.strip(" -–—")
    formats = [
        "%b %d, %Y",
        "%B %d, %Y",
        "%d %b %Y",
        "%d %B %Y",
        "%Y-%m-%d",
        "%b %Y",
        "%B %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    return None


def _filter_reviews(reviews, min_rating=None, max_rating=None, date_from=None, date_to=None):
    """Filter reviews by rating range and date range post-scrape."""
    filtered = []
    for r in reviews:
        # Rating filter
        try:
            rating = float(r.get("rating", 0))
        except (ValueError, TypeError):
            rating = None

        if rating is not None:
            if min_rating is not None and rating < min_rating:
                continue
            if max_rating is not None and rating > max_rating:
                continue

        # Date filter
        parsed_date = _parse_review_date(r.get("date", ""))
        if parsed_date:
            if date_from and parsed_date < date_from:
                continue
            if date_to and parsed_date > date_to:
                continue

        filtered.append(r)
    return filtered


def _write_csv(reviews, filepath):
    """Write reviews to CSV with BOM for Excel compatibility."""
    if not reviews:
        return
    fieldnames = list(reviews[0].keys())
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(reviews)


def _print_summary(reviews):
    """Print summary stats for scraped reviews."""
    if not reviews:
        print("\nNo reviews collected.")
        return

    ratings = []
    dates = []
    for r in reviews:
        try:
            ratings.append(float(r.get("rating", 0)))
        except (ValueError, TypeError):
            pass
        d = _parse_review_date(r.get("date", ""))
        if d:
            dates.append(d)

    print(f"\n{'=' * 60}")
    print(f"  Reviews collected : {len(reviews)}")
    if ratings:
        print(f"  Average rating    : {sum(ratings) / len(ratings):.2f}")
        print(f"  Rating range      : {min(ratings):.1f} - {max(ratings):.1f}")
    if dates:
        print(f"  Date range        : {min(dates).strftime('%Y-%m-%d')} to {max(dates).strftime('%Y-%m-%d')}")
    print(f"{'=' * 60}")


async def _get_browser(headless=False):
    """Initialize Chrome browser with nodriver."""
    browser = await uc.start(
        headless=headless,
        browser_args=[
            "--window-size=1920,1080",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ],
    )
    return browser


async def _retry_async(coro_fn, max_attempts=3, base_delay=2.0, description="operation"):
    """Retry an async operation with exponential backoff."""
    for attempt in range(1, max_attempts + 1):
        try:
            return await coro_fn()
        except Exception as e:
            if attempt == max_attempts:
                raise
            delay = base_delay * (2 ** (attempt - 1))
            print(f"  Retry {attempt}/{max_attempts} for {description} (waiting {delay:.0f}s): {e}")
            await asyncio.sleep(delay)


async def _extract_review_data(review_el):
    """Extract data from a single review element."""
    review_data = {}

    async def get_text(selectors):
        if isinstance(selectors, str):
            selectors = [selectors]
        for selector in selectors:
            try:
                el = await review_el.query_selector(selector)
                if el:
                    text = await el.get_property("textContent")
                    if text:
                        return text.strip()
            except Exception:
                pass
        return ""

    async def get_rating_value(selectors):
        """Try textContent first, then aria-label/title attributes for rating."""
        if isinstance(selectors, str):
            selectors = [selectors]
        for selector in selectors:
            try:
                el = await review_el.query_selector(selector)
                if el:
                    text = await el.get_property("textContent")
                    if text and text.strip():
                        val = text.strip()
                        # Extract numeric rating from text like "5.0"
                        match = re.search(r"(\d+\.?\d*)", val)
                        if match:
                            return match.group(1)
                    # Fallback: check aria-label (e.g. "4 out of 5 stars")
                    for attr in ("aria-label", "title"):
                        try:
                            attr_val = await el.get_property(attr)
                            if attr_val:
                                match = re.search(r"(\d+\.?\d*)", attr_val)
                                if match:
                                    return match.group(1)
                        except Exception:
                            pass
            except Exception:
                pass
        return ""

    # Overall Rating
    review_data["rating"] = await get_rating_value([
        "[class*='ratingNumber']",
        ".rating .value-title",
        "span[class*='rating']",
    ])

    # Title
    review_data["title"] = await get_text([
        "a[data-test='review-details-title']",
        ".reviewLink",
        "h2 a",
        ".summary",
    ])

    # Date
    review_data["date"] = await get_text([
        "[class*='timestamp']",
        ".date",
        "time",
        ".reviewDateTime",
    ])

    # Employee Status
    review_data["employee_status"] = await get_text([
        "[data-test='review-details-employee-status']",
        ".eg4psks0",
        ".mainText",
    ])

    # Job Title
    review_data["job_title"] = await get_text([
        "[data-test='review-details-job-title']",
        ".authorJobTitle",
        ".reviewer",
    ])

    # Location
    review_data["location"] = await get_text([
        "[data-test='review-details-location']",
        ".authorLocation",
    ])

    # Pros
    review_data["pros"] = await get_text([
        "[data-test='review-text-pros']",
        ".pros span",
        ".v2__EIReviewDetailsV2__fullWidth:nth-of-type(1) span",
    ])

    # Cons
    review_data["cons"] = await get_text([
        "[data-test='review-text-cons']",
        ".cons span",
        ".v2__EIReviewDetailsV2__fullWidth:nth-of-type(2) span",
    ])

    # Advice to Management
    review_data["advice"] = await get_text([
        "[data-test='review-text-advice']",
        ".adviceMgmt span",
    ])

    # Recommend
    review_data["recommends"] = await get_text([
        "[data-test='recommends']",
        ".recommends",
    ])

    # CEO Approval
    review_data["ceo_approval"] = await get_text([
        "[data-test='ceo-approval']",
        ".ceoApproval",
    ])

    # Business Outlook
    review_data["business_outlook"] = await get_text([
        "[data-test='business-outlook']",
        ".outlook",
    ])

    # Sub-ratings
    for key, selectors in SUB_RATING_SELECTORS.items():
        review_data[key] = await get_rating_value(selectors)

    return review_data


async def _dismiss_overlays(page):
    """Dismiss cookie banners, popups, and other overlays."""
    for selector in [
        "#onetrust-accept-btn-handler",
        "[alt='Close']",
        "[aria-label='Close']",
        "button.modal_closeIcon",
    ]:
        try:
            el = await page.select(selector)
            if el:
                await el.click()
                await asyncio.sleep(0.5)
        except Exception:
            pass


async def _check_cloudflare(page, max_retries=3):
    """Check for Cloudflare block and retry if detected.

    Returns True if page is OK, False if blocked after all retries.
    """
    for attempt in range(max_retries):
        try:
            content = await page.get_content()
        except Exception:
            return True  # Can't check, assume OK

        if "Help Us Protect Glassdoor" in content or "CF-103" in content:
            if attempt < max_retries - 1:
                wait = 10 * (attempt + 1)
                print(f"  Cloudflare block detected. Waiting {wait}s before retry ({attempt + 1}/{max_retries})...")
                await asyncio.sleep(wait)
                await page.reload()
                await asyncio.sleep(5)
            else:
                print("  Blocked by Cloudflare after all retries. Try again later or use a VPN.")
                return False
        else:
            return True
    return False


async def scrape_reviews(page, url, limit=100, sort=None):
    """Scrape reviews from a Glassdoor company page."""
    global _reviews_collected

    final_url = _build_url(url, sort=sort)
    reviews = []
    page_num = 1
    reviews_per_page = 10  # Glassdoor typically shows 10 per page
    estimated_pages = (limit + reviews_per_page - 1) // reviews_per_page

    print(f"\nTarget: {limit} reviews (~{estimated_pages} pages)")
    print(f"URL: {final_url}\n")

    # Navigate with retry
    async def nav():
        await page.get(final_url)
        await asyncio.sleep(5)

    await _retry_async(nav, description="initial navigation")

    # Check Cloudflare
    if not await _check_cloudflare(page):
        return reviews

    await _dismiss_overlays(page)

    while len(reviews) < limit:
        est_remaining = max(0, estimated_pages - page_num)
        print(
            f"  Page {page_num}/{estimated_pages} | "
            f"{len(reviews)}/{limit} reviews | "
            f"~{est_remaining} pages remaining"
        )

        await asyncio.sleep(3)

        # Check for blocks
        if not await _check_cloudflare(page):
            break

        # Expand "Show More" buttons
        try:
            show_more_buttons = await page.query_selector_all(
                "[data-test='expandReview'], .expand-review"
            )
            for btn in show_more_buttons:
                try:
                    await btn.click()
                    await asyncio.sleep(0.3)
                except Exception:
                    pass
        except Exception:
            pass

        # Get review containers
        review_elements = await page.query_selector_all(
            "[data-test='reviewsList'] > div, .empReview, [data-test='review'], .gdReview"
        )

        if not review_elements:
            print("  No reviews found on page. Structure may have changed.")
            break

        page_review_count = 0
        for review_el in review_elements:
            if len(reviews) >= limit:
                break
            try:
                review_data = await _extract_review_data(review_el)
                if review_data.get("title") or review_data.get("pros") or review_data.get("cons"):
                    reviews.append(review_data)
                    _reviews_collected = reviews  # Update global for signal handler
                    page_review_count += 1
            except Exception:
                continue

        if page_review_count == 0:
            print("  No extractable reviews on this page. Stopping.")
            break

        # Navigate to next page with retry
        try:
            next_btn = await page.select(
                "[data-test='pagination-next'], .nextButton, button[aria-label='Next']"
            )
            if not next_btn:
                print("  No more pages available.")
                break

            class_attr = await next_btn.get_property("className")
            if class_attr and "disabled" in class_attr:
                print("  No more pages available.")
                break

            async def go_next():
                await next_btn.click()
                await asyncio.sleep(3)

            await _retry_async(go_next, description="next page navigation")
            page_num += 1

        except Exception as e:
            print(f"  Error navigating to next page: {e}")
            break

    return reviews


async def main_async(args):
    """Async main function."""
    global _browser, _reviews_collected, _output_file

    # Determine output filename
    output = args.output
    if not output:
        company = _extract_company_name(args.url)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output = f"{company}_reviews_{timestamp}.csv"
    _output_file = output

    # Parse date filters
    date_from = None
    date_to = None
    if args.date_from:
        date_from = datetime.strptime(args.date_from, "%Y-%m-%d")
    if args.date_to:
        date_to = datetime.strptime(args.date_to, "%Y-%m-%d")

    print("=" * 60)
    print("  Glassdoor Review Scraper")
    print("=" * 60)
    print(f"  URL     : {args.url}")
    print(f"  Limit   : {args.limit} reviews")
    print(f"  Sort    : {args.sort or 'default'}")
    print(f"  Output  : {output}")
    if args.min_rating is not None or args.max_rating is not None:
        print(f"  Rating  : {args.min_rating or '*'} - {args.max_rating or '*'}")
    if date_from or date_to:
        print(f"  Dates   : {args.date_from or '*'} to {args.date_to or '*'}")
    print(f"  Headless: {args.headless}")
    print("=" * 60)

    browser = await _get_browser(headless=args.headless)
    _browser = browser
    page = await browser.get("about:blank")

    try:
        # When filtering post-scrape, fetch more to compensate for filtered-out reviews
        fetch_limit = args.limit
        has_post_filters = (
            args.min_rating is not None
            or args.max_rating is not None
            or date_from is not None
            or date_to is not None
        )
        if has_post_filters:
            fetch_limit = args.limit * 3  # Over-fetch to account for filtering

        reviews = await scrape_reviews(page, args.url, limit=fetch_limit, sort=args.sort)

        # Apply post-scrape filters
        if has_post_filters:
            before = len(reviews)
            reviews = _filter_reviews(
                reviews,
                min_rating=args.min_rating,
                max_rating=args.max_rating,
                date_from=date_from,
                date_to=date_to,
            )
            print(f"\n  Filtered: {before} -> {len(reviews)} reviews")
            # Trim to requested limit
            reviews = reviews[: args.limit]

        if reviews:
            _write_csv(reviews, output)
            _print_summary(reviews)
            print(f"  Saved to: {output}")
        else:
            print("\nNo reviews found.")

    finally:
        browser.stop()
        _browser = None


def main():
    parser = ArgumentParser(description="Scrape Glassdoor reviews to CSV")
    parser.add_argument("-u", "--url", required=True, help="Glassdoor reviews URL")
    parser.add_argument("-o", "--output", default=None, help="Output CSV file (auto-generated if not set)")
    parser.add_argument("-l", "--limit", type=int, default=DEFAULT_LIMIT, help="Max reviews to collect")
    parser.add_argument("--headless", action="store_true", help="Run browser in headless mode")
    parser.add_argument(
        "--sort",
        choices=list(SORT_OPTIONS.keys()),
        default=None,
        help="Sort order for reviews",
    )
    parser.add_argument("--min-rating", type=float, default=None, help="Minimum rating filter (1-5)")
    parser.add_argument("--max-rating", type=float, default=None, help="Maximum rating filter (1-5)")
    parser.add_argument("--date-from", default=None, help="Filter reviews from this date (YYYY-MM-DD)")
    parser.add_argument("--date-to", default=None, help="Filter reviews up to this date (YYYY-MM-DD)")
    args = parser.parse_args()

    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
