import { SlateTool } from 'slates';
import { z } from 'zod';
import { YouTubeAnalyticsClient } from '../lib/client';
import { youtubeAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

export let queryAnalytics = SlateTool.create(spec, {
  name: 'Query Analytics',
  key: 'query_analytics',
  description: `Query YouTube Analytics to generate custom reports with specific metrics and dimensions.
Retrieve data about views, watch time, likes, subscribers, revenue, and more for your channel or specific content.
Supports filtering by video, country, traffic source, device type, and other dimensions.
Use \`channelId\` to specify which channel to query, or leave blank to query the authenticated user's channel.`,
  instructions: [
    'Dates must be in YYYY-MM-DD format.',
    'Metrics are comma-separated, e.g. "views,likes,estimatedMinutesWatched".',
    'Dimensions are comma-separated, e.g. "day,country".',
    'Filters use the format "dimension==value", separated by semicolons for multiple filters, e.g. "video==VIDEO_ID;country==US".',
    'Sort fields can be prefixed with "-" for descending order.'
  ],
  constraints: [
    'Some data may be limited when metrics do not meet a minimum threshold.',
    'Ad performance reports require the yt-analytics-monetary.readonly scope.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(youtubeAnalyticsActionScopes.queryAnalytics)
  .input(
    z.object({
      channelId: z
        .string()
        .optional()
        .describe(
          'YouTube channel ID to query. Leave empty to use the authenticated user\'s channel ("channel==MINE").'
        ),
      contentOwnerId: z
        .string()
        .optional()
        .describe(
          'Content owner ID for content owner reports. Use this instead of channelId for content owner queries.'
        ),
      startDate: z.string().describe('Start date for the report in YYYY-MM-DD format.'),
      endDate: z.string().describe('End date for the report in YYYY-MM-DD format.'),
      metrics: z
        .string()
        .describe(
          'Comma-separated list of metrics to retrieve, e.g. "views,likes,estimatedMinutesWatched,subscribersGained".'
        ),
      dimensions: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of dimensions to group by, e.g. "day", "country", "video", "ageGroup,gender".'
        ),
      filters: z
        .string()
        .optional()
        .describe('Semicolon-separated filters, e.g. "video==VIDEO_ID;country==US".'),
      sort: z
        .string()
        .optional()
        .describe(
          'Comma-separated sort fields, prefix with "-" for descending, e.g. "-views".'
        ),
      maxResults: z.number().optional().describe('Maximum number of rows to return.'),
      startIndex: z
        .number()
        .optional()
        .describe('1-based index of first row to retrieve for pagination.'),
      currency: z
        .string()
        .optional()
        .describe('Currency code for financial metrics (default: USD).'),
      includeHistoricalChannelData: z
        .boolean()
        .optional()
        .describe('Include data from before the channel was linked to a content owner.')
    })
  )
  .output(
    z.object({
      columnHeaders: z
        .array(
          z.object({
            name: z.string().describe('Column name.'),
            dataType: z.string().describe('Data type: STRING, INTEGER, or FLOAT.'),
            columnType: z.string().describe('Column type: DIMENSION or METRIC.')
          })
        )
        .describe('Column header definitions for the result rows.'),
      rows: z
        .array(z.array(z.union([z.string(), z.number()])))
        .describe('Result rows, each containing values matching the column headers.'),
      totalRows: z.number().describe('Total number of rows returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new YouTubeAnalyticsClient({ token: ctx.auth.token });

    let ids: string;
    if (ctx.input.contentOwnerId) {
      ids = `contentOwner==${ctx.input.contentOwnerId}`;
    } else if (ctx.input.channelId) {
      ids = `channel==${ctx.input.channelId}`;
    } else {
      ids = 'channel==MINE';
    }

    let result = await client.queryReports({
      ids,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      metrics: ctx.input.metrics,
      dimensions: ctx.input.dimensions,
      filters: ctx.input.filters,
      sort: ctx.input.sort,
      maxResults: ctx.input.maxResults,
      startIndex: ctx.input.startIndex,
      currency: ctx.input.currency,
      includeHistoricalChannelData: ctx.input.includeHistoricalChannelData
    });

    let metricsSummary = ctx.input.metrics.split(',').join(', ');
    let dimensionsSummary = ctx.input.dimensions ? ` grouped by ${ctx.input.dimensions}` : '';

    return {
      output: {
        columnHeaders: result.columnHeaders,
        rows: result.rows,
        totalRows: result.rows.length
      },
      message: `Retrieved **${result.rows.length}** rows for metrics: ${metricsSummary}${dimensionsSummary} (${ctx.input.startDate} to ${ctx.input.endDate}).`
    };
  })
  .build();
