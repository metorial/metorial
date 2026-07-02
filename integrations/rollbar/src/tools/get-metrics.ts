import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMetrics = SlateTool.create(spec, {
  name: 'Get Metrics',
  key: 'get_metrics',
  description: `Retrieve project metrics and reports from Rollbar, including top active items, occurrence counts over time, and activated/reactivated item counts. Use the \`reportType\` field to select which metric to fetch.`,
  instructions: [
    '"topActiveItems" — returns the most active items in a time window.',
    '"occurrenceCounts" — returns occurrence counts bucketed over time.',
    '"activatedCounts" — returns counts of new and reactivated items over time.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['topActiveItems', 'occurrenceCounts', 'activatedCounts'])
        .describe('Type of metric report to fetch'),
      hours: z
        .number()
        .optional()
        .describe('Time window in hours (for topActiveItems, default 24)'),
      environment: z.string().optional().describe('Filter by environment'),
      itemId: z.number().optional().describe('Filter by item ID (for occurrenceCounts)'),
      bucketSize: z
        .enum(['60', '3600', '86400'])
        .optional()
        .describe(
          'Bucket size in seconds (for occurrenceCounts/activatedCounts): 60=minute, 3600=hour, 86400=day'
        )
    })
  )
  .output(
    z.object({
      topItems: z
        .array(
          z.object({
            itemId: z.number().describe('Item ID'),
            counter: z.number().optional().describe('Item counter'),
            title: z.string().optional().describe('Item title'),
            level: z.string().optional().describe('Severity level'),
            occurrenceCount: z
              .number()
              .optional()
              .describe('Number of occurrences in the time window')
          })
        )
        .optional()
        .describe('Top active items (for topActiveItems report)'),
      counts: z
        .array(
          z.object({
            timestamp: z.number().describe('Unix timestamp of the bucket start'),
            count: z.number().describe('Count in this bucket')
          })
        )
        .optional()
        .describe('Time-bucketed counts (for occurrenceCounts/activatedCounts)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.reportType === 'topActiveItems') {
      let result = await client.getTopActiveItems({
        hours: ctx.input.hours,
        environment: ctx.input.environment
      });

      let items = (result?.result || []).map((entry: any) => ({
        itemId: entry.item?.id,
        counter: entry.item?.counter,
        title: entry.item?.title,
        level: entry.item?.level_string || entry.item?.level,
        occurrenceCount: entry.occurrence_count
      }));

      return {
        output: { topItems: items },
        message: `Retrieved **${items.length}** top active items${ctx.input.hours ? ` in the last ${ctx.input.hours} hours` : ''}.`
      };
    }

    if (ctx.input.reportType === 'occurrenceCounts') {
      let result = await client.getOccurrenceCounts({
        item_id: ctx.input.itemId,
        environment: ctx.input.environment,
        bucket_size: ctx.input.bucketSize
      });

      let counts = (result?.result || []).map((entry: any) => ({
        timestamp: entry[0],
        count: entry[1]
      }));

      return {
        output: { counts },
        message: `Retrieved **${counts.length}** occurrence count buckets.`
      };
    }

    if (ctx.input.reportType === 'activatedCounts') {
      let result = await client.getActivatedCounts({
        environment: ctx.input.environment,
        bucket_size: ctx.input.bucketSize
      });

      let counts = (result?.result || []).map((entry: any) => ({
        timestamp: entry[0],
        count: entry[1]
      }));

      return {
        output: { counts },
        message: `Retrieved **${counts.length}** activated item count buckets.`
      };
    }

    throw new Error(`Unknown report type: ${ctx.input.reportType}`);
  })
  .build();
