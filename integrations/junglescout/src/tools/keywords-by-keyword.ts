import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let keywordDataSchema = z.object({
  keywordId: z.string().describe('Unique identifier for the keyword'),
  keyword: z.string().describe('The keyword text'),
  monthlySearchVolumeExact: z
    .number()
    .nullable()
    .describe('Exact match monthly search volume'),
  monthlySearchVolumeBroad: z
    .number()
    .nullable()
    .describe('Broad match monthly search volume'),
  monthlyTrend: z.number().nullable().describe('Monthly search volume trend percentage'),
  quarterlyTrend: z.number().nullable().describe('Quarterly search volume trend percentage'),
  dominantCategory: z
    .string()
    .nullable()
    .describe('The dominant product category for this keyword'),
  suggestedPpcBidBroad: z
    .number()
    .nullable()
    .describe('Suggested PPC bid for broad match in dollars'),
  suggestedPpcBidExact: z
    .number()
    .nullable()
    .describe('Suggested PPC bid for exact match in dollars'),
  sponsoredBrandAdBid: z
    .number()
    .nullable()
    .describe('Suggested Sponsored Brand Ad bid in dollars'),
  easeOfRankingScore: z.number().nullable().describe('Ease of ranking score (0-100)'),
  organicProductCount: z
    .number()
    .nullable()
    .describe('Number of organic products for this keyword'),
  sponsoredProductCount: z
    .number()
    .nullable()
    .describe('Number of sponsored products for this keyword')
});

export let keywordsByKeywordTool = SlateTool.create(spec, {
  name: 'Keywords by Keyword',
  key: 'keywords_by_keyword',
  description: `Explore keyword ideas and variations starting from one or more seed keywords. Returns related keywords with search volume, PPC bid estimates, ranking difficulty, and competition metrics. Use this for **keyword discovery** and expanding your keyword list for Amazon product listings, PPC campaigns, or market research.`,
  instructions: [
    'Provide one or more seed keywords to discover related keyword opportunities.',
    'Optionally filter by category to narrow results to specific product domains.'
  ],
  constraints: ['Maximum page size is 100 results.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchTerms: z
        .array(z.string())
        .min(1)
        .describe('Seed keywords to discover related keywords'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Filter by dominant category names (marketplace-specific)'),
      minMonthlySearchVolumeExact: z
        .number()
        .optional()
        .describe('Minimum exact match monthly search volume filter'),
      maxMonthlySearchVolumeExact: z
        .number()
        .optional()
        .describe('Maximum exact match monthly search volume filter'),
      minMonthlySearchVolumeBroad: z
        .number()
        .optional()
        .describe('Minimum broad match monthly search volume filter'),
      maxMonthlySearchVolumeBroad: z
        .number()
        .optional()
        .describe('Maximum broad match monthly search volume filter'),
      minWordCount: z.number().optional().describe('Minimum keyword word count filter'),
      maxWordCount: z.number().optional().describe('Maximum keyword word count filter'),
      minOrganicProductCount: z
        .number()
        .optional()
        .describe('Minimum organic product count filter'),
      maxOrganicProductCount: z
        .number()
        .optional()
        .describe('Maximum organic product count filter'),
      sort: z
        .enum([
          'monthly_search_volume_exact',
          '-monthly_search_volume_exact',
          'monthly_search_volume_broad',
          '-monthly_search_volume_broad',
          'monthly_trend',
          '-monthly_trend',
          'quarterly_trend',
          '-quarterly_trend',
          'ease_of_ranking_score',
          '-ease_of_ranking_score',
          'organic_product_count',
          '-organic_product_count'
        ])
        .optional()
        .describe('Sort field (prefix with - for descending)'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100)'),
      pageCursor: z.string().optional().describe('Pagination cursor for fetching next page')
    })
  )
  .output(
    z.object({
      keywords: z.array(keywordDataSchema).describe('List of related keywords'),
      totalItems: z.number().nullable().describe('Total number of matching keywords'),
      nextPageCursor: z
        .string()
        .nullable()
        .describe('Cursor for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      marketplace: ctx.config.marketplace,
      apiType: ctx.config.apiType
    });

    let result = await client.keywordsByKeyword({
      searchTerms: ctx.input.searchTerms,
      categories: ctx.input.categories,
      minMonthlySearchVolumeExact: ctx.input.minMonthlySearchVolumeExact,
      maxMonthlySearchVolumeExact: ctx.input.maxMonthlySearchVolumeExact,
      minMonthlySearchVolumeBroad: ctx.input.minMonthlySearchVolumeBroad,
      maxMonthlySearchVolumeBroad: ctx.input.maxMonthlySearchVolumeBroad,
      minWordCount: ctx.input.minWordCount,
      maxWordCount: ctx.input.maxWordCount,
      minOrganicProductCount: ctx.input.minOrganicProductCount,
      maxOrganicProductCount: ctx.input.maxOrganicProductCount,
      sort: ctx.input.sort,
      pagination: {
        pageSize: ctx.input.pageSize,
        pageCursor: ctx.input.pageCursor
      }
    });

    let keywords = (result.data || []).map((item: any) => ({
      keywordId: item.id || '',
      keyword: item.attributes?.name || '',
      monthlySearchVolumeExact: item.attributes?.monthly_search_volume_exact ?? null,
      monthlySearchVolumeBroad: item.attributes?.monthly_search_volume_broad ?? null,
      monthlyTrend: item.attributes?.monthly_trend ?? null,
      quarterlyTrend: item.attributes?.quarterly_trend ?? null,
      dominantCategory: item.attributes?.dominant_category ?? null,
      suggestedPpcBidBroad: item.attributes?.ppc_bid_broad ?? null,
      suggestedPpcBidExact: item.attributes?.ppc_bid_exact ?? null,
      sponsoredBrandAdBid: item.attributes?.sp_brand_ad_bid ?? null,
      easeOfRankingScore: item.attributes?.ease_of_ranking_score ?? null,
      organicProductCount: item.attributes?.organic_product_count ?? null,
      sponsoredProductCount: item.attributes?.sponsored_product_count ?? null
    }));

    let totalItems = result.meta?.total_items ?? null;
    let nextPageCursor: string | null = null;
    if (result.links?.next) {
      let nextUrl = new URL(result.links.next, 'https://developer.junglescout.com');
      nextPageCursor = nextUrl.searchParams.get('page[cursor]');
    }

    return {
      output: {
        keywords,
        totalItems,
        nextPageCursor
      },
      message: `Found **${keywords.length}** related keywords for search terms: "${ctx.input.searchTerms.join('", "')}"${totalItems ? ` (${totalItems} total)` : ''}.`
    };
  })
  .build();
