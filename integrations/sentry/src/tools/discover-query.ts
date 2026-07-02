import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let discoverQueryTool = SlateTool.create(spec, {
  name: 'Discover Query',
  key: 'discover_query',
  description: `Run an ad-hoc query against Sentry's Discover (Events) interface. Query errors and transactions with custom fields, filters, aggregations, and sorting. Useful for performance analysis, error analysis, and custom reporting.`,
  instructions: [
    'Fields can include: title, event.type, project, user.email, timestamp, count(), count_unique(user), p50(), p95(), avg(transaction.duration), etc.',
    'Query uses Sentry search syntax: e.g. "event.type:error level:fatal" or "transaction:/api/users"',
    'Sort by any field, prefix with "-" for descending: e.g. "-count()" or "-timestamp"',
    'statsPeriod examples: "1h", "24h", "7d", "14d", "30d"'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fields: z
        .array(z.string())
        .describe('Fields to return (e.g. ["title", "count()", "last_seen()"])'),
      query: z.string().optional().describe('Sentry search query filter'),
      sort: z
        .string()
        .optional()
        .describe('Field to sort by (prefix with "-" for descending)'),
      projectSlugs: z
        .array(z.string())
        .optional()
        .describe('Filter by project slugs; resolved to Sentry project IDs before querying'),
      projectIds: z
        .array(z.number())
        .optional()
        .describe('Filter by Sentry numeric project IDs'),
      statsPeriod: z
        .string()
        .optional()
        .default('24h')
        .describe('Time range (e.g. "1h", "24h", "7d", "14d")'),
      start: z
        .string()
        .optional()
        .describe('ISO 8601 start date (alternative to statsPeriod)'),
      end: z.string().optional().describe('ISO 8601 end date (alternative to statsPeriod)'),
      perPage: z
        .number()
        .optional()
        .default(20)
        .describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      rows: z.array(z.record(z.string(), z.any())).describe('Query result rows'),
      meta: z.any().optional().describe('Query metadata including field types')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.discoverQuery({
      field: ctx.input.fields,
      query: ctx.input.query,
      sort: ctx.input.sort,
      project: ctx.input.projectSlugs,
      projectIds: ctx.input.projectIds,
      statsPeriod: ctx.input.start ? undefined : ctx.input.statsPeriod,
      start: ctx.input.start,
      end: ctx.input.end,
      per_page: ctx.input.perPage
    });

    let rows = result?.data || [];
    let meta = result?.meta;

    return {
      output: { rows, meta },
      message: `Discover query returned **${rows.length}** results.`
    };
  })
  .build();
