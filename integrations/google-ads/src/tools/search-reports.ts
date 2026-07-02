import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

export let searchReports = SlateTool.create(spec, {
  name: 'Run GAQL Query',
  key: 'search_reports',
  description: `Executes a Google Ads Query Language (GAQL) query to retrieve reporting data, resource details, or metrics from a Google Ads account. Supports querying any resource type including campaigns, ad groups, ads, keywords, conversions, and more.

Use this tool to build custom reports, fetch performance metrics, or look up specific resources. The query follows the GAQL syntax: \`SELECT fields FROM resource WHERE conditions ORDER BY field LIMIT n\`.`,
  instructions: [
    'GAQL queries follow the format: SELECT <fields> FROM <resource> [WHERE <conditions>] [ORDER BY <field> [ASC|DESC]] [LIMIT <n>]',
    'Common resources: campaign, ad_group, ad_group_ad, ad_group_criterion, keyword_view, campaign_budget, bidding_strategy, conversion_action',
    'Use segments like segments.date to break down metrics by date',
    'Date ranges can be filtered with segments.date BETWEEN "YYYY-MM-DD" AND "YYYY-MM-DD" or using DURING LAST_30_DAYS, THIS_MONTH, etc.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleAdsActionScopes.searchReports)
  .input(
    z.object({
      customerId: z.string().describe('The Google Ads customer account ID (without hyphens)'),
      query: z.string().describe('The GAQL query string to execute'),
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of results per page (default: 10000)'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.any())
        .describe('Array of result rows, each containing the requested fields'),
      totalResultsCount: z
        .string()
        .optional()
        .describe('Total number of results matching the query'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token to retrieve the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let response = await client.search(
      ctx.input.customerId,
      ctx.input.query,
      ctx.input.pageSize,
      ctx.input.pageToken
    );

    let resultCount = response.results?.length ?? 0;

    return {
      output: {
        results: response.results || [],
        totalResultsCount: response.totalResultsCount,
        nextPageToken: response.nextPageToken
      },
      message: `Query returned **${resultCount}** result(s)${response.nextPageToken ? ' (more pages available)' : ''}.`
    };
  })
  .build();
