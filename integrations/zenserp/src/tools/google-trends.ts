import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let trendsResultSchema = z
  .object({
    keywords: z.array(z.string()).optional().describe('Keywords queried'),
    popularity: z
      .array(z.record(z.string(), z.any()))
      .optional()
      .describe('Search popularity over time with averages'),
    geographicPopularity: z
      .array(z.record(z.string(), z.any()))
      .optional()
      .describe('Popularity breakdown by geographic region'),
    relatedSearches: z
      .array(z.record(z.string(), z.any()))
      .optional()
      .describe('Related search phrases'),
    relatedTopics: z.array(z.record(z.string(), z.any())).optional().describe('Related topics')
  })
  .passthrough();

export let googleTrends = SlateTool.create(spec, {
  name: 'Google Trends',
  key: 'google_trends',
  description: `Find current Google trending searches matching one or more keywords. Zenserp now returns Trending now data for the past seven days, with search volume, related queries, categories, and provider notices. Historical keyword interest reports are unavailable.`,
  instructions: [
    'Provide keywords to match current trending search queries and their related queries. A keyword that is not trending can return no rows.',
    'Use `timeframe` for a supported recent window: "now 1-H", "now 4-H", "now 1-d", or "now 7-d". Historical windows are unavailable.',
    'Use `category` for category-specific trends (Google Trends category ID).',
    'Omit `trendsType`; the current Trends endpoint cannot return its legacy report types. Use trending_searches to retrieve current trends without keyword filtering.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z
        .array(z.string())
        .min(1)
        .describe('One or more keywords to look up trends for'),
      timeframe: z
        .string()
        .optional()
        .describe(
          'Recent time window: "now 1-H", "now 4-H", "now 1-d", or "now 7-d". Historical windows are unavailable on the current Trends endpoint; omit for the provider default.'
        ),
      category: z.string().optional().describe('Google Trends category ID'),
      trendsType: z
        .enum([
          'interest_over_time',
          'interest_by_region',
          'related_queries',
          'related_topics'
        ])
        .optional()
        .describe(
          'Legacy report selector retained for compatibility. Omit this field: the current Trends endpoint cannot return these report types and any supplied value is rejected.'
        ),
      language: z.string().optional().describe('Language code (hl), e.g. "en"'),
      country: z
        .string()
        .optional()
        .describe('Country code sent as the provider geo parameter, e.g. "US"')
    })
  )
  .output(trendsResultSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.getTrends({
      keywords: ctx.input.keywords,
      timeframe: ctx.input.timeframe,
      category: ctx.input.category,
      type: ctx.input.trendsType,
      hl: ctx.input.language,
      gl: ctx.input.country
    });

    return {
      output: {
        keywords: ctx.input.keywords,
        ...results
      },
      message: `Retrieved Google Trends data for **${ctx.input.keywords.join(', ')}**.`
    };
  })
  .build();
