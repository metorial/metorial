import { SlateTool } from 'slates';
import { z } from 'zod';
import { receiptMessage, receiptOutput, SerpApiClient } from '../lib/client';
import { number, searchMetadataSchema, text } from '../lib/contracts';
import { searchParams } from '../lib/params';
import { spec } from '../spec';

export let trendsSearchTool = SlateTool.create(spec, {
  name: 'Google Trends',
  key: 'google_trends',
  description: `Retrieve Google Trends data including interest over time, interest by region, related queries, and related topics for any search term. Also supports fetching currently trending searches. Useful for market research, SEO analysis, and trend discovery.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Search term to analyze trends for (required unless fetching trending searches)'
        ),
      dataType: z
        .enum([
          'interest_over_time',
          'compared_breakdown_by_region',
          'related_queries',
          'related_topics',
          'trending_now'
        ])
        .default('interest_over_time')
        .describe('Type of trends data to retrieve'),
      geo: z
        .string()
        .optional()
        .describe('Geographic filter (e.g., "US", "GB", "US-CA" for California)'),
      category: z.number().optional().describe('Google Trends category ID'),
      timeRange: z
        .string()
        .optional()
        .describe(
          'Time range (e.g., "today 12-m" for past 12 months, "today 5-y" for past 5 years, "2020-01-01 2023-12-31" for custom range)'
        ),
      language: z.string().optional().describe('Language code'),
      hours: z
        .number()
        .optional()
        .describe('Trending Now time window: 4, 24, 48 or 168 hours.'),
      trendingCategoryId: z
        .number()
        .optional()
        .describe('Native Trending Now category_id; distinct from Google Trends category.'),
      async: z
        .boolean()
        .optional()
        .describe(
          'Submit asynchronously and return the native search ID/status. Not compatible with noCache or Ludicrous Speed accounts.'
        ),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      isComplete: z
        .boolean()
        .describe(
          'Whether native search status is Success; queued/processing receipts are incomplete.'
        ),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Native pagination metadata; follow native offsets/tokens without inferring a total.'
        ),
      searchMetadata: searchMetadataSchema.optional(),
      interestOverTime: z
        .array(
          z.object({
            date: z.string().optional().describe('Date of the data point'),
            values: z
              .array(
                z.object({
                  query: z.string().optional(),
                  value: z.number().optional(),
                  displayValue: z.string().optional(),
                  extractedValue: z.number().optional()
                })
              )
              .optional()
          })
        )
        .optional()
        .describe('Interest over time data points'),
      interestByRegion: z
        .array(
          z.object({
            location: z.string().optional(),
            value: z.number().optional(),
            extractedValue: z.number().optional(),
            maxValueIndex: z.number().optional(),
            values: z
              .array(
                z.object({
                  query: z.string().optional(),
                  displayValue: z.string().optional(),
                  extractedValue: z.number().optional()
                })
              )
              .optional()
          })
        )
        .optional()
        .describe('Interest by region/subregion'),
      relatedQueries: z
        .array(
          z.object({
            query: z.string().optional(),
            value: z.string().optional(),
            extractedValue: z.number().optional(),
            link: z.string().optional()
          })
        )
        .optional()
        .describe('Related search queries'),
      relatedTopics: z
        .array(
          z.object({
            title: z.string().optional(),
            type: z.string().optional(),
            value: z.string().optional(),
            extractedValue: z.number().optional(),
            link: z.string().optional()
          })
        )
        .optional()
        .describe('Related topics'),
      relatedGroups: z
        .object({ queries: z.unknown().optional(), topics: z.unknown().optional() })
        .optional()
        .describe('Native rising and top groups, both preserved.'),
      trendingSearches: z
        .array(
          z.object({
            query: z.string().optional(),
            link: z.string().optional()
          })
        )
        .optional()
        .describe('Currently trending searches')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token, accountId: ctx.auth.accountId });

    let params = searchParams('google_trends', ctx.input);

    let data = await client.search(params);

    let interestOverTime = (data.interest_over_time?.timeline_data || []).map((d: any) => ({
      date: d.date,
      values: d.values?.map((v: any) => ({
        query: v.query,
        value: number(v.value) ?? number(v.extracted_value),
        displayValue: text(v.value),
        extractedValue: v.extracted_value
      }))
    }));

    let interestByRegion = (
      data.compared_breakdown_by_region ||
      data.interest_by_region ||
      []
    ).map((d: any) => ({
      location: d.location || d.geo,
      value: number(d.value),
      extractedValue: d.extracted_value,
      maxValueIndex: d.max_value_index,
      values: d.values?.map((v: any) => ({
        query: v.query,
        displayValue: text(v.value),
        extractedValue: number(v.extracted_value)
      }))
    }));

    let relatedQueries = (data.related_queries?.rising || data.related_queries?.top || []).map(
      (d: any) => ({
        query: d.query,
        value: text(d.value) ?? (number(d.value) !== undefined ? String(d.value) : undefined),
        extractedValue: d.extracted_value,
        link: d.link
      })
    );

    let relatedTopics = (data.related_topics?.rising || data.related_topics?.top || []).map(
      (d: any) => ({
        title: d.topic?.title,
        type: d.topic?.type,
        value: text(d.value) ?? (number(d.value) !== undefined ? String(d.value) : undefined),
        extractedValue: d.extracted_value,
        link: d.link
      })
    );

    let trendingSearches = (data.trending_searches || data.daily_search_trends || []).map(
      (d: any) => ({
        query: d.query || d.title,
        link: d.link
      })
    );

    return {
      output: {
        ...receiptOutput(data),
        relatedGroups: { queries: data.related_queries, topics: data.related_topics },
        interestOverTime: interestOverTime.length > 0 ? interestOverTime : undefined,
        interestByRegion: interestByRegion.length > 0 ? interestByRegion : undefined,
        relatedQueries: relatedQueries.length > 0 ? relatedQueries : undefined,
        relatedTopics: relatedTopics.length > 0 ? relatedTopics : undefined,
        trendingSearches: trendingSearches.length > 0 ? trendingSearches : undefined
      },
      message: receiptMessage(
        data,
        ctx.input.dataType === 'trending_now'
          ? `Retrieved **${trendingSearches.length}** trending searches${ctx.input.geo ? ` in ${ctx.input.geo}` : ''}.`
          : `Google Trends data for "${ctx.input.query}" (${ctx.input.dataType}) retrieved successfully.`
      )
    };
  })
  .build();
