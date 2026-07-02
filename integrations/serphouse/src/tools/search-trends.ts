import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTrends = SlateTool.create(spec, {
  name: 'Search Google Trends',
  key: 'search_trends',
  description: `Query Google Trends for keyword interest over time. Compare up to 5 keywords and get time-series interest data, geographic breakdowns, and related queries. Supports filtering by time range, geographic region, category, and property (web search, YouTube, images, news, Google Shopping).`,
  instructions: [
    'Separate multiple keywords with commas for comparison (max 5).',
    'Time range examples: "now 1-H" (past hour), "now 7-d" (past 7 days), "today 1-m" (past month), "today 12-m" (past year), "today 5-y" (past 5 years), or a custom range like "2024-01-01 2024-06-30".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z
        .string()
        .describe(
          'Single keyword or comma-separated keywords (max 5), e.g. "react,vue,angular"'
        ),
      time: z.string().default('today 12-m').describe('Time range for trends data'),
      timezoneOffset: z.number().default(0).describe('Timezone offset value'),
      property: z
        .enum(['', 'youtube', 'images', 'news', 'froogle'])
        .optional()
        .describe(
          'Search property: empty for web, "youtube", "images", "news", or "froogle" (Google Shopping)'
        ),
      category: z.number().optional().describe('Category ID (0 for all categories)'),
      geo: z.string().optional().describe('Geographic target code, e.g. "US", "GB"'),
      languageCode: z.string().optional().describe('Language code, e.g. "en"')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      message: z.string().describe('Response message'),
      searchMetadata: z.any().optional().describe('Search metadata'),
      searchParameters: z.any().optional().describe('Search parameters used'),
      timeseries: z.any().optional().describe('Time-series interest data'),
      geoMap: z.any().optional().describe('Geographic interest breakdown'),
      relatedQueries: z.any().optional().describe('Related queries data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.trendsSearch({
      keywords: ctx.input.keywords,
      time: ctx.input.time,
      time_zone_offset: ctx.input.timezoneOffset,
      ...(ctx.input.property !== undefined ? { property: ctx.input.property } : {}),
      ...(ctx.input.category !== undefined ? { category: ctx.input.category } : {}),
      ...(ctx.input.geo ? { geo: ctx.input.geo } : {}),
      ...(ctx.input.languageCode ? { language_code: ctx.input.languageCode } : {})
    });

    let resultsData = response?.results;

    return {
      output: {
        status: response?.status ?? 'unknown',
        message: response?.msg ?? '',
        searchMetadata: response?.search_metadata,
        searchParameters: response?.search_parameters,
        timeseries: resultsData?.TIMESERIES,
        geoMap: resultsData?.GEO_MAP,
        relatedQueries: resultsData?.RELATED_QUERIES
      },
      message: `Google Trends search for **"${ctx.input.keywords}"** over **${ctx.input.time}** completed.`
    };
  })
  .build();
