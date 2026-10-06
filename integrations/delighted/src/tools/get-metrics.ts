import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectUnavailableDelighted, unavailableMessage } from '../lib/unavailable';
import { spec } from '../spec';

export let getMetrics = SlateTool.create(spec, {
  name: 'Get Metrics',
  key: 'get_metrics',
  description:
    'DEPRECATED — Delighted customer access ended on July 1, 2026. This legacy tool is retained for compatibility and cannot be executed.',
  instructions: [unavailableMessage],
  tags: {
    deprecated: true,
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      since: z
        .number()
        .optional()
        .describe('Unix timestamp to restrict metrics to responses on or after this time'),
      until: z
        .number()
        .optional()
        .describe('Unix timestamp to restrict metrics to responses on or before this time'),
      trend: z.string().optional().describe('Restrict to a specific trend by its ID')
    })
  )
  .output(
    z.object({
      nps: z.number().describe('Net Promoter Score (-100 to 100)'),
      promoterCount: z.number().describe('Number of promoters (score 9-10)'),
      promoterPercent: z.number().describe('Percentage of promoters'),
      passiveCount: z.number().describe('Number of passives (score 7-8)'),
      passivePercent: z.number().describe('Percentage of passives'),
      detractorCount: z.number().describe('Number of detractors (score 0-6)'),
      detractorPercent: z.number().describe('Percentage of detractors'),
      responseCount: z.number().describe('Total number of responses')
    })
  )
  .handleInvocation(async () => rejectUnavailableDelighted())
  .build();
