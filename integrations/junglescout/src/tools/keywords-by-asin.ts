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

export let keywordsByAsinTool = SlateTool.create(spec, {
  name: 'Keywords by ASIN',
  key: 'keywords_by_asin',
  description: `Discover which keywords drive traffic to specific Amazon products by querying up to 10 ASINs. Returns related keywords with search volume, PPC bid estimates, competition metrics, and ranking difficulty scores. Use this for **reverse ASIN lookup** to analyze competitor keyword strategies or find keyword opportunities for your own products.`,
  instructions: [
    'Provide up to 10 ASINs to query. ASINs should be valid Amazon Standard Identification Numbers.',
    'Use sort options to order results by relevance metrics like search volume or ease of ranking.'
  ],
  constraints: ['Maximum of 10 ASINs per request.', 'Maximum page size is 100 results.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      asins: z
        .array(z.string())
        .min(1)
        .max(10)
        .describe('List of Amazon ASINs to research (1-10)'),
      includeVariants: z
        .boolean()
        .optional()
        .describe('Include product variants in keyword results'),
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
      keywords: z
        .array(keywordDataSchema)
        .describe('List of keywords associated with the queried ASINs'),
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

    let result = await client.keywordsByAsin({
      asins: ctx.input.asins,
      includeVariants: ctx.input.includeVariants,
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
      message: `Found **${keywords.length}** keywords for ASINs: ${ctx.input.asins.join(', ')}${totalItems ? ` (${totalItems} total)` : ''}.`
    };
  })
  .build();
