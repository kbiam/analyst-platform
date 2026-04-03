import { z } from "zod";

export const extractRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export const jobStatusSchema = z.enum([
  "pending",
  "scraping",
  "enriching",
  "completed",
  "failed",
]);
