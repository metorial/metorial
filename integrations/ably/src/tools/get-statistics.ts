import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyRestClient } from '../lib/client';
import { spec } from '../spec';

export let getStatistics = SlateTool.create(spec, {
  name: 'Get Statistics',
  key: 'get_statistics',
  description: `Retrieve application-level usage statistics from Ably, including message counts, connections, API requests, and more. Statistics can be aggregated by minute, hour, day, or month.`,
  instructions: [
    'Requires API Key authentication with the "statistics" capability.',
    'Times are specified as milliseconds since Unix epoch.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z
        .string()
        .optional()
        .describe('Start of time window as milliseconds since Unix epoch'),
      end: z
        .string()
        .optional()
        .describe('End of time window as milliseconds since Unix epoch'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of stat records to return (default: 100, max: 1000)'),
      direction: z
        .enum(['forwards', 'backwards'])
        .optional()
        .describe(
          'Query direction: "forwards" (oldest first) or "backwards" (newest first, default)'
        ),
      unit: z
        .enum(['minute', 'hour', 'day', 'month'])
        .optional()
        .describe('Aggregation unit for statistics (default: "minute")')
    })
  )
  .output(
    z.object({
      statistics: z
        .array(z.any())
        .describe(
          'Array of statistics records with message counts, connections, API requests, etc.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyRestClient(ctx.auth.token);

    let stats = await client.getStatistics({
      start: ctx.input.start,
      end: ctx.input.end,
      limit: ctx.input.limit,
      direction: ctx.input.direction,
      unit: ctx.input.unit
    });

    return {
      output: { statistics: stats || [] },
      message: `Retrieved **${(stats || []).length}** statistics record(s)${ctx.input.unit ? ` aggregated by ${ctx.input.unit}` : ''}.`
    };
  })
  .build();
