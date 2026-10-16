import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  responseArray,
  responseCollection,
  responseNullableString,
  responseNumber,
  responsePagination,
  responseRecord,
  responseRequiredNumber,
  responseString
} from '../lib/response';
import { spec } from '../spec';

let keywordDataSchema = z.object({
  country: z.string().nullable().optional().describe('Marketplace country code'),
  recommendedPromotions: z
    .number()
    .nullable()
    .optional()
    .describe('Estimated daily promotional units for improving keyword rank'),
  relevancyScore: z
    .number()
    .nullable()
    .optional()
    .describe('Relevance to the queried ASINs or keyword'),
  updatedAt: z.string().nullable().optional().describe('Keyword update timestamp'),
  primaryAsin: z
    .string()
    .nullable()
    .optional()
    .describe('First ASIN used as the comparison baseline'),
  organicRank: z
    .number()
    .nullable()
    .optional()
    .describe('Organic rank of the primary ASIN; zero means unranked'),
  sponsoredRank: z
    .number()
    .nullable()
    .optional()
    .describe('Sponsored rank of the primary ASIN'),
  overallRank: z
    .number()
    .nullable()
    .optional()
    .describe('First overall rank of the primary ASIN'),
  organicRankingAsinsCount: z.number().nullable().optional(),
  sponsoredRankingAsinsCount: z.number().nullable().optional(),
  averageCompetitorOrganicRank: z.number().nullable().optional(),
  averageCompetitorSponsoredRank: z.number().nullable().optional(),
  relativeOrganicPosition: z.number().nullable().optional(),
  relativeSponsoredPosition: z.number().nullable().optional(),
  competitorOrganicRank: z
    .array(z.object({ asin: z.string(), organic_rank: z.number() }))
    .nullable()
    .optional()
    .describe('Native per-competitor organic ranks'),
  competitorSponsoredRank: z
    .array(z.object({ asin: z.string(), sponsored_rank: z.number() }))
    .nullable()
    .optional()
    .describe('Native per-competitor sponsored ranks'),
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
    .describe('Suggested PPC bid for broad match in marketplace currency'),
  suggestedPpcBidExact: z
    .number()
    .nullable()
    .describe('Suggested PPC bid for exact match in marketplace currency'),
  sponsoredBrandAdBid: z
    .number()
    .nullable()
    .describe('Suggested Sponsored Brand Ad bid in marketplace currency'),
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
          'name',
          '-name',
          'dominant_category',
          '-dominant_category',
          'monthly_trend',
          '-monthly_trend',
          'quarterly_trend',
          '-quarterly_trend',
          'monthly_search_volume_exact',
          '-monthly_search_volume_exact',
          'monthly_search_volume_broad',
          '-monthly_search_volume_broad',
          'recommended_promotions',
          '-recommended_promotions',
          'sp_brand_ad_bid',
          '-sp_brand_ad_bid',
          'ppc_bid_broad',
          '-ppc_bid_broad',
          'ppc_bid_exact',
          '-ppc_bid_exact',
          'ease_of_ranking_score',
          '-ease_of_ranking_score',
          'relevancy_score',
          '-relevancy_score',
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
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response including native attributes and metadata'),
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

    let keywords = responseCollection(result).map(item => ({
      keywordId: item.id,
      primaryAsin: responseNullableString(item.attributes.primary_asin, 'primary_asin'),
      organicRank: responseNumber(item.attributes.organic_rank, 'organic_rank'),
      sponsoredRank: responseNumber(item.attributes.sponsored_rank, 'sponsored_rank'),
      overallRank: responseNumber(item.attributes.overall_rank, 'overall_rank'),
      organicRankingAsinsCount: responseNumber(
        item.attributes.organic_ranking_asins_count,
        'organic_ranking_asins_count'
      ),
      sponsoredRankingAsinsCount: responseNumber(
        item.attributes.sponsored_ranking_asins_count,
        'sponsored_ranking_asins_count'
      ),
      averageCompetitorOrganicRank: responseNumber(
        item.attributes.avg_competitor_organic_rank,
        'avg_competitor_organic_rank'
      ),
      averageCompetitorSponsoredRank: responseNumber(
        item.attributes.avg_competitor_sponsored_rank,
        'avg_competitor_sponsored_rank'
      ),
      relativeOrganicPosition: responseNumber(
        item.attributes.relative_organic_position,
        'relative_organic_position'
      ),
      relativeSponsoredPosition: responseNumber(
        item.attributes.relative_sponsored_position,
        'relative_sponsored_position'
      ),
      competitorOrganicRank:
        item.attributes.competitor_organic_rank == null
          ? null
          : responseArray(
              item.attributes.competitor_organic_rank,
              'competitor organic ranks'
            ).map(value => {
              let competitor = responseRecord(value, 'competitor organic rank');
              return {
                asin: responseString(competitor.asin, 'competitor ASIN'),
                organic_rank: responseRequiredNumber(
                  competitor.organic_rank,
                  'competitor organic rank'
                )
              };
            }),
      competitorSponsoredRank:
        item.attributes.competitor_sponsored_rank == null
          ? null
          : responseArray(
              item.attributes.competitor_sponsored_rank,
              'competitor sponsored ranks'
            ).map(value => {
              let competitor = responseRecord(value, 'competitor sponsored rank');
              return {
                asin: responseString(competitor.asin, 'competitor ASIN'),
                sponsored_rank: responseRequiredNumber(
                  competitor.sponsored_rank,
                  'competitor sponsored rank'
                )
              };
            }),
      keyword: responseString(item.attributes.name, 'keyword name'),
      country: responseNullableString(item.attributes.country, 'keyword country'),
      recommendedPromotions: responseNumber(
        item.attributes.recommended_promotions,
        'recommended promotions'
      ),
      relevancyScore: responseNumber(item.attributes.relevancy_score, 'relevancy score'),
      updatedAt: responseNullableString(
        item.attributes.updated_at,
        'keyword update timestamp'
      ),
      monthlySearchVolumeExact: responseNumber(
        item.attributes.monthly_search_volume_exact,
        'monthly_search_volume_exact'
      ),
      monthlySearchVolumeBroad: responseNumber(
        item.attributes.monthly_search_volume_broad,
        'monthly_search_volume_broad'
      ),
      monthlyTrend: responseNumber(item.attributes.monthly_trend, 'monthly_trend'),
      quarterlyTrend: responseNumber(item.attributes.quarterly_trend, 'quarterly_trend'),
      dominantCategory: responseNullableString(
        item.attributes.dominant_category,
        'dominant category'
      ),
      suggestedPpcBidBroad: responseNumber(item.attributes.ppc_bid_broad, 'ppc_bid_broad'),
      suggestedPpcBidExact: responseNumber(item.attributes.ppc_bid_exact, 'ppc_bid_exact'),
      sponsoredBrandAdBid: responseNumber(item.attributes.sp_brand_ad_bid, 'sp_brand_ad_bid'),
      easeOfRankingScore: responseNumber(
        item.attributes.ease_of_ranking_score,
        'ease_of_ranking_score'
      ),
      organicProductCount: responseNumber(
        item.attributes.organic_product_count,
        'organic_product_count'
      ),
      sponsoredProductCount: responseNumber(
        item.attributes.sponsored_product_count,
        'sponsored_product_count'
      )
    }));

    let { totalItems, nextPageCursor } = responsePagination(result);

    return {
      output: {
        raw: result,
        keywords,
        totalItems,
        nextPageCursor
      },
      message: `Found **${keywords.length}** keywords for ASINs: ${ctx.input.asins.join(', ')}${totalItems ? ` (${totalItems} total)` : ''}.`
    };
  })
  .build();
