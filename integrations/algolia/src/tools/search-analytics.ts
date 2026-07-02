import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let searchAnalytics = SlateTool.create(spec, {
  name: 'Search Analytics',
  key: 'search_analytics',
  description: `Retrieve analytics data about search performance for an Algolia index. Supports multiple metric types:
- **topSearches**: Most popular search queries, ranked by frequency.
- **searchesCount**: Total number of searches over time, returned as a time series.
- **topHits**: Most frequently returned (and clicked) hit objects across searches.
- **noResultsSearches**: Search queries that returned zero results, useful for identifying content gaps.
- **usersCount**: Number of unique users performing searches over time.
- **clickRate**: Click-through rate on search results over time (requires click analytics events).
- **conversionRate**: Conversion rate from search results over time (requires conversion analytics events).
All metrics support date range filtering, result limiting, and analytics tag filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      metric: z
        .enum([
          'topSearches',
          'searchesCount',
          'topHits',
          'noResultsSearches',
          'usersCount',
          'clickRate',
          'conversionRate'
        ])
        .describe('The analytics metric to retrieve'),
      indexName: z.string().describe('Name of the Algolia index to retrieve analytics for'),
      startDate: z
        .string()
        .optional()
        .describe(
          'Start date for the analytics period in ISO 8601 format (e.g., "2024-01-01")'
        ),
      endDate: z
        .string()
        .optional()
        .describe('End date for the analytics period in ISO 8601 format (e.g., "2024-01-31")'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      tags: z
        .string()
        .optional()
        .describe(
          'Analytics tag to filter by (only includes searches that were tagged with this value)'
        )
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      analyticsRegion: ctx.config.analyticsRegion
    });

    let { metric, indexName, startDate, endDate, limit, tags } = ctx.input;

    let params: Record<string, any> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (limit !== undefined) params.limit = limit;
    if (tags) params.tags = tags;

    let metricLabels: Record<string, string> = {
      topSearches: 'top searches',
      searchesCount: 'searches count',
      topHits: 'top hits',
      noResultsSearches: 'no-results searches',
      usersCount: 'users count',
      clickRate: 'click rate',
      conversionRate: 'conversion rate'
    };

    let metricFns: Record<
      string,
      (indexName: string, params?: Record<string, any>) => Promise<any>
    > = {
      topSearches: (idx, p) => client.getTopSearches(idx, p),
      searchesCount: (idx, p) => client.getSearchesCount(idx, p),
      topHits: (idx, p) => client.getTopHits(idx, p),
      noResultsSearches: (idx, p) => client.getNoResultsSearches(idx, p),
      usersCount: (idx, p) => client.getUsersCount(idx, p),
      clickRate: (idx, p) => client.getClickRate(idx, p),
      conversionRate: (idx, p) => client.getConversionRate(idx, p)
    };

    let metricFn = metricFns[metric]!;
    let result = await metricFn(indexName, params);

    let dateRange =
      startDate || endDate ? ` (${startDate ?? '...'} to ${endDate ?? '...'})` : '';

    return {
      output: result,
      message: `Retrieved **${metricLabels[metric]}** analytics for index **${indexName}**${dateRange}.`
    };
  })
  .build();
