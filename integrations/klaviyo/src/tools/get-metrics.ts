import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let getMetrics = SlateTool.create(spec, {
  name: 'Get Metrics',
  key: 'get_metrics',
  description: `Retrieve available metrics (event types) from Klaviyo. Metrics include built-in types like "Opened Email", "Placed Order", and any custom events.
Use metrics to understand what event types are available for querying aggregates or filtering events.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('Filter string, e.g. equals(name,"Placed Order")'),
      pageCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      metrics: z
        .array(
          z.object({
            metricId: z.string().describe('Metric ID'),
            name: z.string().optional().describe('Metric name'),
            integration: z.any().optional().describe('Integration info'),
            created: z.string().optional().describe('Creation timestamp'),
            updated: z.string().optional().describe('Last updated timestamp')
          })
        )
        .describe('List of metrics'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      hasMore: z.boolean().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getMetrics({
      filter: ctx.input.filter,
      pageCursor: ctx.input.pageCursor,
      pageSize: ctx.input.pageSize
    });

    let metrics = result.data.map(m => ({
      metricId: m.id ?? '',
      name: m.attributes?.name ?? undefined,
      integration: m.attributes?.integration ?? undefined,
      created: m.attributes?.created ?? undefined,
      updated: m.attributes?.updated ?? undefined
    }));

    let nextCursor = extractPaginationCursor(result.links);

    return {
      output: { metrics, nextCursor, hasMore: !!nextCursor },
      message: `Retrieved **${metrics.length}** metrics`
    };
  })
  .build();
