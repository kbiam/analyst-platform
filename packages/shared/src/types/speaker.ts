export interface Speaker {
  id: string;
  name: string;
  title?: string;
  company?: string;
  /** LinkedIn profile URL found via Exa */
  linkedinUrl?: string;
  /** Enriched headline from LinkedIn */
  headline?: string;
  /** Enriched role from LinkedIn (may differ from scraped title) */
  enrichedRole?: string;
  /** Enriched company from LinkedIn (may differ from scraped company) */
  enrichedCompany?: string;
  /** Status of enrichment for this speaker */
  enrichmentStatus: "pending" | "enriching" | "enriched" | "failed";
  /** Error message if enrichment failed */
  enrichmentError?: string;
}

export interface SpeakerEnrichment {
  linkedinUrl: string;
  headline?: string;
  role?: string;
  company?: string;
}
