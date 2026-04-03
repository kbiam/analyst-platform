import { z } from "zod";

export const speakerEnrichmentSchema = z.object({
  linkedinUrl: z.string().url(),
  headline: z.string().optional(),
  role: z.string().optional(),
  company: z.string().optional(),
});

export const speakerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  title: z.string().optional(),
  company: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  headline: z.string().optional(),
  enrichedRole: z.string().optional(),
  enrichedCompany: z.string().optional(),
  enrichmentStatus: z.enum(["pending", "enriching", "enriched", "failed"]),
  enrichmentError: z.string().optional(),
});

/** Schema for the raw output from the scraper agent */
export const scrapedSpeakerSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  company: z.string().optional(),
});

export const scrapedSpeakersOutputSchema = z.object({
  speakers: z.array(scrapedSpeakerSchema),
});

export type ScrapedSpeaker = z.infer<typeof scrapedSpeakerSchema>;
export type ScrapedSpeakersOutput = z.infer<typeof scrapedSpeakersOutputSchema>;
