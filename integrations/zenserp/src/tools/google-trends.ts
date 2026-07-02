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
  description: `Retrieve Google Trends data for one or more keywords. Returns search popularity over time, geographic popularity breakdown, related search phrases, and related topics. Supports timeframe filtering and category selection.`,
  instructions: [
    'Provide one or more keywords to compare their search popularity.',
    'Use `timeframe` to specify a time range, e.g. "today 12-m" for past 12 months, "today 3-m" for past 3 months, "now 7-d" for past 7 days.',
    'Use `category` for category-specific trends (Google Trends category ID).',
    'The `trendsType` parameter controls what data is returned: "interest_over_time", "interest_by_region", "related_queries", or "related_topics".'
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
        .describe('Time range, e.g. "today 12-m", "today 3-m", "now 7-d"'),
      category: z.string().optional().describe('Google Trends category ID'),
      trendsType: z
        .enum([
          'interest_over_time',
          'interest_by_region',
          'related_queries',
          'related_topics'
        ])
        .optional()
        .describe('Type of trends data to return'),
      language: z.string().optional().describe('Language code (hl), e.g. "en"'),
      country: z.string().optional().describe('Country code (gl), e.g. "us"')
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
