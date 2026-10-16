import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { resultArray, resultNumber, resultText, SearchApiClient } from '../lib/client';
import { spec } from '../spec';

export let trendsSearch = SlateTool.create(spec, {
  name: 'Google Trends',
  key: 'trends_search',
  description: `Query Google Trends for interest-over-time data, geographic interest, related queries, and related topics. Supports comparing up to 5 search terms and filtering by category, region, time range, and search type (web, images, news, shopping, YouTube).`,
  instructions: [
    'Use **dataType** to choose between timeseries data, geographic map, related queries, or related topics.',
    'Separate multiple terms with commas in the query to compare up to 5 terms.',
    'Use **time** for custom ranges like "2023-01-01 2023-12-31" or presets like "today 12-m".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search term(s) — comma-separated to compare up to 5 terms'),
      dataType: z
        .enum(['TIMESERIES', 'GEO_MAP', 'RELATED_QUERIES', 'RELATED_TOPICS'])
        .describe('Type of trends data to retrieve'),
      geo: z
        .string()
        .optional()
        .describe('Geographic region code (e.g., "US", "GB"). Defaults to worldwide'),
      time: z
        .string()
        .optional()
        .describe('Time range (e.g., "today 12-m", "2023-01-01 2023-12-31", "now 7-d")'),
      category: z
        .number()
        .optional()
        .describe('Category ID to filter results (0 = all categories)'),
      searchType: z
        .enum(['web', 'images', 'news', 'shopping', 'youtube'])
        .optional()
        .describe('Type of Google search to analyze'),
      region: z
        .enum(['COUNTRY', 'REGION', 'DMA', 'CITY'])
        .optional()
        .describe('Geographic granularity level (for GEO_MAP data type)')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      searchQuery: z.string().optional().describe('The query that was searched'),
      timelineData: z
        .array(
          z.object({
            date: z.string().optional().describe('Date or date range'),
            values: z
              .array(
                z.object({
                  query: z.string().optional().describe('Search term'),
                  value: z.number().optional().describe('Interest value (0-100)')
                })
              )
              .optional()
              .describe('Values for each query term')
          })
        )
        .optional()
        .describe('Interest over time data (TIMESERIES)'),
      geoData: z
        .array(
          z.object({
            location: z.string().optional().describe('Location name'),
            locationCode: z.string().optional().describe('Location code'),
            value: z.number().optional().describe('Interest value for a single search term'),
            values: z
              .array(
                z.object({
                  query: z.string().optional().describe('Search term'),
                  value: z.number().optional().describe('Interest value')
                })
              )
              .optional()
              .describe('Interest values for all compared search terms')
          })
        )
        .optional()
        .describe('Interest by region data (GEO_MAP)'),
      relatedQueries: z
        .object({
          top: z
            .array(
              z.object({
                query: z.string().optional().describe('Related query'),
                value: z.number().optional().describe('Score value')
              })
            )
            .optional()
            .describe('Top related queries'),
          rising: z
            .array(
              z.object({
                query: z.string().optional().describe('Rising query'),
                value: z.string().optional().describe('Growth value or "Breakout"')
              })
            )
            .optional()
            .describe('Rising related queries')
        })
        .optional()
        .describe('Related queries data'),
      relatedTopics: z
        .object({
          top: z
            .array(
              z.object({
                title: z.string().optional().describe('Topic title'),
                type: z.string().optional().describe('Topic type'),
                value: z.number().optional().describe('Score value')
              })
            )
            .optional()
            .describe('Top related topics'),
          rising: z
            .array(
              z.object({
                title: z.string().optional().describe('Rising topic title'),
                type: z.string().optional().describe('Topic type'),
                value: z.string().optional().describe('Growth value or "Breakout"')
              })
            )
            .optional()
            .describe('Rising related topics')
        })
        .optional()
        .describe('Related topics data')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.query.split(',').length > 5) {
      throw createApiServiceError('Compare at most five Google Trends search terms.', {
        reason: 'invalid_trends_query'
      });
    }
    if (ctx.input.region && ctx.input.dataType !== 'GEO_MAP') {
      throw createApiServiceError('region is only supported for GEO_MAP data.', {
        reason: 'invalid_trends_region'
      });
    }
    if (ctx.input.region === 'COUNTRY' && ctx.input.geo) {
      throw createApiServiceError(
        'COUNTRY granularity requires worldwide geography; omit geo.',
        { reason: 'invalid_trends_region' }
      );
    }
    let client = new SearchApiClient({ token: ctx.auth.token });

    let gpropMap: Record<string, string> = {
      web: '',
      images: 'images',
      news: 'news',
      shopping: 'froogle',
      youtube: 'youtube'
    };

    let data = await client.search({
      engine: 'google_trends',
      q: ctx.input.query,
      data_type: ctx.input.dataType,
      geo: ctx.input.geo,
      time: ctx.input.time,
      cat: ctx.input.category,
      gprop: ctx.input.searchType ? gpropMap[ctx.input.searchType] : undefined,
      region: ctx.input.region
    });

    let output: any = {
      raw: data,
      searchQuery: data.search_parameters?.q || ctx.input.query
    };

    if (ctx.input.dataType === 'TIMESERIES') {
      output.timelineData = resultArray(
        data.interest_over_time?.timeline_data ?? data.timeline_data,
        'interest_over_time.timeline_data'
      ).map((t: any) => ({
        date: t.date,
        values: resultArray(t.values, 'timeline_data.values').map((v: any) => ({
          query: v.query,
          value: resultNumber(v.extracted_value ?? v.value, 'timeline value')
        }))
      }));
    }

    if (ctx.input.dataType === 'GEO_MAP') {
      output.geoData = resultArray(data.interest_by_region, 'interest_by_region').map(
        (g: any) => ({
          location: g.name ?? g.location,
          locationCode: g.geo || g.location_code,
          value: resultNumber(
            g.extracted_value ??
              g.value ??
              (g.values?.length === 1 ? g.values[0].extracted_value : undefined),
            'regional value'
          ),
          values:
            g.values === undefined
              ? undefined
              : resultArray(g.values, 'interest_by_region.values').map((v: any) => ({
                  query: v.query,
                  value: resultNumber(v.extracted_value, 'regional query value')
                }))
        })
      );
    }

    if (ctx.input.dataType === 'RELATED_QUERIES') {
      output.relatedQueries = {
        top: resultArray(data.related_queries?.top, 'related_queries.top').map((q: any) => ({
          query: q.query,
          value: resultNumber(q.extracted_value ?? q.value, 'related query value')
        })),
        rising: resultArray(data.related_queries?.rising, 'related_queries.rising').map(
          (q: any) => ({
            query: q.query,
            value: resultText(q.values ?? q.value ?? q.extracted_value, 'rising query value')
          })
        )
      };
    }

    if (ctx.input.dataType === 'RELATED_TOPICS') {
      output.relatedTopics = {
        top: resultArray(data.related_topics?.top, 'related_topics.top').map((t: any) => ({
          title: t.title ?? t.topic?.title,
          type: t.type ?? t.topic?.type,
          value: resultNumber(t.extracted_value ?? t.value, 'related topic value')
        })),
        rising: resultArray(data.related_topics?.rising, 'related_topics.rising').map(
          (t: any) => ({
            title: t.title ?? t.topic?.title,
            type: t.type ?? t.topic?.type,
            value: resultText(t.values ?? t.value ?? t.extracted_value, 'rising topic value')
          })
        )
      };
    }

    return {
      output,
      message: `Retrieved ${ctx.input.dataType} trends data for "${ctx.input.query}".`
    };
  })
  .build();
