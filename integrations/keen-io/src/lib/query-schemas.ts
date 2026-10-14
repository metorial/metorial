import { z } from 'zod';

export let filterSchema = z
  .object({
    propertyName: z.string().describe('The event property to filter on'),
    operator: z
      .enum([
        'eq',
        'ne',
        'lt',
        'lte',
        'gt',
        'gte',
        'exists',
        'in',
        'contains',
        'not_contains',
        'within',
        'regex'
      ])
      .describe('The filter operator'),
    propertyValue: z.any().describe('The value to compare against')
  })
  .describe('A filter to narrow the scope of events');

export let timeframeSchema = z
  .union([
    z
      .string()
      .describe(
        'A relative timeframe string, e.g. "this_7_days", "previous_30_days", "this_month"'
      ),
    z
      .object({
        start: z.string().describe('ISO 8601 start datetime'),
        end: z.string().describe('ISO 8601 end datetime')
      })
      .describe('An absolute timeframe with start and end dates')
  ])
  .describe('Time period over which to run the analysis');
