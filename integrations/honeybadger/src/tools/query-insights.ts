import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { projectIdSchema } from '../lib/validation';
import { spec } from '../spec';

export let queryInsights = SlateTool.create(spec, {
  name: 'Query Insights',
  key: 'query_insights',
  description: `Run a BadgerQL query against Honeybadger Insights to search logs and custom events. Returns structured results with metadata about the query execution.`,
  instructions: [
    'Use BadgerQL syntax for queries. Example: `fields @ts, @preview | limit 10`',
    'Time range defaults to last 3 hours. Use ISO 8601 durations like "PT1H" (1 hour) or "P7D" (7 days), or "today".'
  ],
  constraints: ['Query results are subject to the limits of your Honeybadger plan.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      query: z
        .string()
        .describe('BadgerQL query string (e.g., "fields @ts, @preview | limit 10")'),
      timeRange: z
        .string()
        .optional()
        .describe(
          'Time range: ISO 8601 duration (e.g., "PT3H", "P7D"), "today", or date range. Defaults to PT3H'
        ),
      streamIds: z
        .array(z.string())
        .optional()
        .describe(
          'Optional Insights stream IDs from project details; omitted means all streams'
        ),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone identifier (e.g., "America/New_York")')
    })
  )
  .output(
    z.object({
      results: z.array(z.record(z.string(), z.unknown())).describe('Query results'),
      fields: z.array(z.string()).optional().describe('Field names in the results'),
      rowCount: z.number().optional().describe('Number of rows returned'),
      totalCount: z.number().optional().describe('Total matching rows'),
      startAt: z.string().optional().describe('Query start time'),
      endAt: z.string().optional().describe('Query end time')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient(ctx.auth);
    let data = await client.queryInsights(ctx.input.projectId, ctx.input.query, {
      ts: ctx.input.timeRange,
      timezone: ctx.input.timezone,
      streamIds: ctx.input.streamIds
    });

    return {
      output: {
        results: data.results || [],
        fields: data.meta?.fields,
        rowCount: data.meta?.row_count,
        totalCount: data.meta?.total_count,
        startAt: data.meta?.start_at,
        endAt: data.meta?.end_at
      },
      message: `Query returned **${data.meta?.row_count ?? data.results.length}** row(s)${data.meta?.total_count ? ` of ${data.meta.total_count} total` : ''}.`
    };
  })
  .build();
