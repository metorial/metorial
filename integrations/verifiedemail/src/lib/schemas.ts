import { z } from 'zod';

export let emailListSchema = z.object({
  listId: z.string().describe('Unique identifier of the email list'),
  name: z.string().describe('Title assigned to the email list'),
  emailCount: z.number().optional().describe('Total email count, when reported'),
  verifiedCount: z.number().optional().describe('Verified email count, when reported'),
  unverifiedCount: z.number().optional().describe('Pending email count, when reported'),
  status: z
    .string()
    .describe('Provider status: new, ready, progress, failed, partial, or verified'),
  createdAt: z.string().optional().describe('Creation timestamp, when reported'),
  updatedAt: z.string().optional().describe('Last update timestamp, when reported'),
  records: z
    .record(z.string(), z.union([z.number(), z.boolean()]))
    .optional()
    .describe('Provider list statistics'),
  autoVerify: z.string().optional().describe('Automatic verification mode'),
  dateLastVerified: z.string().nullable().optional().describe('Last verification timestamp'),
  isAutoRefill: z
    .boolean()
    .optional()
    .describe('Whether automatic credit purchasing is enabled'),
  error: z.string().optional().describe('Last provider error reported for the list')
});

export let resultsDownloadSchema = z.object({
  id: z.string().describe('Download request ID. Pass this to get_results_download.'),
  listId: z.string().describe('Email list ID'),
  status: z.string().describe('Download status: new, progress, completed, failed, or deleted'),
  include: z.array(z.string()).optional().describe('Included verification result categories'),
  dateAdded: z.string().optional().describe('Request creation timestamp'),
  dateReady: z.string().optional().describe('File readiness timestamp')
});
