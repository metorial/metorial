import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let teamIdSchema = z
  .string()
  .optional()
  .describe(
    'Team ID. Call list_teams to discover accessible teams. Required unless this connection already has a saved team ID.'
  );

export let resolveTeamId = (teamId: string | undefined, legacyTeamId: unknown) => {
  let resolved = teamId ?? legacyTeamId;
  if (typeof resolved !== 'string' || !resolved.trim()) {
    throw createApiServiceError('Call list_teams and provide the selected teamId.');
  }
  return resolved;
};

export let sourceSummarySchema = z.object({
  sourceId: z.string().describe('Source identifier'),
  type: z
    .string()
    .describe('Source type (url, document, sitemap, wp, urls, csv, rss, qa, youtube)'),
  status: z.string().describe('Source status (pending, indexing, processing, ready, failed)'),
  title: z.string().optional().describe('Source title'),
  url: z.string().optional().describe('Source URL'),
  createdAt: z.string().describe('ISO 8601 creation timestamp'),
  pageCount: z.number().describe('Number of pages indexed'),
  chunkCount: z.number().describe('Number of chunks indexed'),
  scheduleInterval: z
    .string()
    .optional()
    .describe('Refresh schedule (daily, weekly, monthly, none)')
});

export let sourceDetailsSchema = sourceSummarySchema.extend({
  faqs: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional()
    .describe('Training question and answer pairs'),
  indexedUrls: z
    .array(z.object({ source: z.string(), title: z.string() }))
    .optional()
    .describe('URLs indexed by this source'),
  warnsList: z.array(z.string()).optional().describe('Warnings from source processing'),
  files: z
    .array(z.object({ p: z.string(), n: z.number().optional() }))
    .optional()
    .describe('Relative filenames and indexed page counts for multi-file sources'),
  processedPages: z
    .object({ count: z.number(), total: z.number() })
    .optional()
    .describe('Files processed and total files while ingestion is in progress')
});
