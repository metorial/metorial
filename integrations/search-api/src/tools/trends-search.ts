import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
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
            value: z.number().optional().describe('Interest value')
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
      searchQuery: data.search_parameters?.q || ctx.input.query
    };

    if (ctx.input.dataType === 'TIMESERIES') {
      output.timelineData = (data.timeline_data || []).map((t: any) => ({
        date: t.date,
        values: (t.values || []).map((v: any) => ({
          query: v.query,
          value: v.value !== undefined ? v.value : v.extracted_value
        }))
      }));
    }

    if (ctx.input.dataType === 'GEO_MAP') {
      output.geoData = (data.interest_by_region || []).map((g: any) => ({
        location: g.location,
        locationCode: g.geo || g.location_code,
        value: g.value !== undefined ? g.value : g.extracted_value
      }));
    }

    if (ctx.input.dataType === 'RELATED_QUERIES') {
      output.relatedQueries = {
        top: (data.related_queries?.top || []).map((q: any) => ({
          query: q.query,
          value: q.value !== undefined ? q.value : q.extracted_value
        })),
        rising: (data.related_queries?.rising || []).map((q: any) => ({
          query: q.query,
          value: String(q.value !== undefined ? q.value : q.extracted_value)
        }))
      };
    }

    if (ctx.input.dataType === 'RELATED_TOPICS') {
      output.relatedTopics = {
        top: (data.related_topics?.top || []).map((t: any) => ({
          title: t.topic?.title,
          type: t.topic?.type,
          value: t.value !== undefined ? t.value : t.extracted_value
        })),
        rising: (data.related_topics?.rising || []).map((t: any) => ({
          title: t.topic?.title,
          type: t.topic?.type,
          value: String(t.value !== undefined ? t.value : t.extracted_value)
        }))
      };
    }

    return {
      output,
      message: `Retrieved ${ctx.input.dataType} trends data for "${ctx.input.query}".`
    };
  })
  .build();
