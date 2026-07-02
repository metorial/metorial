import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchConsoleClient } from '../lib/client';
import { googleSearchConsoleActionScopes } from '../scopes';
import { spec } from '../spec';

let dimensionFilterSchema = z.object({
  dimension: z
    .enum(['query', 'page', 'country', 'device', 'searchAppearance'])
    .describe('Dimension to filter on'),
  operator: z
    .enum([
      'equals',
      'notEquals',
      'contains',
      'notContains',
      'includingRegex',
      'excludingRegex'
    ])
    .describe('Filter operator'),
  expression: z.string().describe('Filter value or regex pattern')
});

export let querySearchAnalytics = SlateTool.create(spec, {
  name: 'Query Search Analytics',
  key: 'query_search_analytics',
  description: `Query Google Search traffic data for a site property. Returns metrics like clicks, impressions, click-through rate (CTR), and average position. Results can be grouped by dimensions such as query, page, country, device, and date. Supports filtering and pagination for large result sets.`,
  instructions: [
    'The siteUrl must match exactly how it appears in Search Console — use URL-prefix format (e.g., "http://www.example.com/") or domain property format (e.g., "sc-domain:example.com").',
    'Dates must be in YYYY-MM-DD format. Data is typically available with a 2-3 day delay.',
    'Use startRow for pagination when results exceed the rowLimit.'
  ],
  constraints: [
    'Maximum 25,000 rows per request.',
    'Performance data is limited to 50,000 rows per day per search type per property.',
    'Data is available for the last 16 months.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleSearchConsoleActionScopes.querySearchAnalytics)
  .input(
    z.object({
      siteUrl: z
        .string()
        .describe(
          'The site URL as defined in Search Console (e.g., "http://www.example.com/" or "sc-domain:example.com")'
        ),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
      dimensions: z
        .array(z.enum(['query', 'page', 'country', 'device', 'searchAppearance', 'date']))
        .optional()
        .describe('Dimensions to group results by'),
      searchType: z
        .enum(['web', 'image', 'video', 'news', 'discover', 'googleNews'])
        .optional()
        .describe('Type of search results to query. Defaults to "web"'),
      filters: z
        .array(dimensionFilterSchema)
        .optional()
        .describe('Filters to apply to the results'),
      aggregationType: z
        .enum(['auto', 'byPage', 'byProperty', 'byNewsShowcasePanel'])
        .optional()
        .describe('How to aggregate results. Defaults to "auto"'),
      rowLimit: z
        .number()
        .min(1)
        .max(25000)
        .optional()
        .describe('Maximum number of rows to return (1-25000). Defaults to 1000'),
      startRow: z
        .number()
        .min(0)
        .optional()
        .describe('Zero-based row offset for pagination. Defaults to 0'),
      dataState: z
        .enum(['final', 'all'])
        .optional()
        .describe('"final" for finalized data only, "all" to include fresh/unfinalized data')
    })
  )
  .output(
    z.object({
      rows: z
        .array(
          z.object({
            keys: z
              .array(z.string())
              .describe(
                'Dimension values for this row, in the order dimensions were requested'
              ),
            clicks: z.number().describe('Number of clicks'),
            impressions: z.number().describe('Number of impressions'),
            ctr: z.number().describe('Click-through rate (0.0 to 1.0)'),
            position: z.number().describe('Average position in search results')
          })
        )
        .describe('Result rows'),
      responseAggregationType: z.string().describe('How the results were aggregated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchConsoleClient(ctx.auth.token);

    let dimensionFilterGroups =
      ctx.input.filters && ctx.input.filters.length > 0
        ? [{ groupType: 'and' as const, filters: ctx.input.filters }]
        : undefined;

    let result = await client.querySearchAnalytics({
      siteUrl: ctx.input.siteUrl,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      dimensions: ctx.input.dimensions,
      searchType: ctx.input.searchType,
      dimensionFilterGroups,
      aggregationType: ctx.input.aggregationType,
      rowLimit: ctx.input.rowLimit,
      startRow: ctx.input.startRow,
      dataState: ctx.input.dataState
    });

    let totalClicks = result.rows.reduce((sum, r) => sum + r.clicks, 0);
    let totalImpressions = result.rows.reduce((sum, r) => sum + r.impressions, 0);

    return {
      output: result,
      message: `Retrieved **${result.rows.length}** rows for **${ctx.input.siteUrl}** (${ctx.input.startDate} to ${ctx.input.endDate}). Total clicks: **${totalClicks}**, total impressions: **${totalImpressions}**.`
    };
  })
  .build();
