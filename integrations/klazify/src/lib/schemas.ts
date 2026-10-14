import { z } from 'zod';

export let refreshSchema = z
  .boolean()
  .optional()
  .describe(
    'Fetch fresh data instead of the cached result. Requires a paid Klazify plan and can take longer.'
  );

export let categorySchema = z
  .object({
    confidence: z.number().describe('Confidence score from 0 to 1'),
    name: z.string().describe('Category name path'),
    IAB1: z.string().optional().describe('IAB Tier 1 category'),
    IAB2: z.string().optional().describe('IAB Tier 2 category'),
    IAB3: z.string().optional().describe('IAB Tier 3 category'),
    IAB4: z.string().optional().describe('IAB Tier 4 category'),
    IAB5: z.string().optional().describe('IAB Tier 5 category'),
    IAB6: z.string().optional().describe('IAB Tier 6 category'),
    IAB12: z.string().optional().describe('IAB v1.2 category')
  })
  .catchall(z.unknown());
