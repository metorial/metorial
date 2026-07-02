import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let brandShareSchema = z.object({
  brandName: z.string().describe('Name of the brand'),
  combinedProductCount: z
    .number()
    .nullable()
    .describe('Total products across organic and sponsored results'),
  combinedWeightedSov: z
    .number()
    .nullable()
    .describe('Combined weighted share of voice percentage'),
  combinedBasicSov: z.number().nullable().describe('Combined basic share of voice percentage'),
  combinedAveragePrice: z
    .number()
    .nullable()
    .describe('Average price across combined results'),
  combinedAveragePosition: z
    .number()
    .nullable()
    .describe('Average position across combined results'),
  organicProductCount: z.number().nullable().describe('Number of organic products'),
  organicWeightedSov: z
    .number()
    .nullable()
    .describe('Organic weighted share of voice percentage'),
  sponsoredProductCount: z.number().nullable().describe('Number of sponsored products'),
  sponsoredWeightedSov: z
    .number()
    .nullable()
    .describe('Sponsored weighted share of voice percentage')
});

export let shareOfVoiceTool = SlateTool.create(spec, {
  name: 'Share of Voice',
  key: 'share_of_voice',
  description: `Analyze brand competition and visibility for a specific Amazon search keyword. Returns share of voice metrics showing how different brands compete across organic and sponsored search results (first 3 pages). Use this for **competitive analysis**, understanding brand positioning, and identifying market share distribution for a keyword.`,
  instructions: [
    'Provide a single keyword to analyze brand share of voice.',
    'Results include both organic and sponsored breakdown per brand.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('The Amazon search keyword to analyze')
    })
  )
  .output(
    z.object({
      keyword: z.string().describe('The analyzed keyword'),
      searchVolume30Day: z
        .number()
        .nullable()
        .describe('30-day search volume for the keyword'),
      medianPpcBid: z.number().nullable().describe('Median PPC bid for the keyword'),
      productCount: z.number().nullable().describe('Total product count in search results'),
      brands: z.array(brandShareSchema).describe('Brand share of voice breakdown')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      marketplace: ctx.config.marketplace,
      apiType: ctx.config.apiType
    });

    let result = await client.shareOfVoice({
      keyword: ctx.input.keyword
    });

    let items = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];

    let searchVolume30Day: number | null = null;
    let medianPpcBid: number | null = null;
    let productCount: number | null = null;
    let brands: any[] = [];

    for (let item of items) {
      let attrs = item.attributes || {};

      if (attrs.estimated_30_day_search_volume !== undefined) {
        searchVolume30Day = attrs.estimated_30_day_search_volume ?? null;
      }
      if (attrs.median_ppc_bid !== undefined) {
        medianPpcBid = attrs.median_ppc_bid ?? null;
      }
      if (attrs.product_count !== undefined) {
        productCount = attrs.product_count ?? null;
      }

      // Brand data may come as individual items in the data array
      if (attrs.brand) {
        brands.push({
          brandName: attrs.brand || '',
          combinedProductCount: attrs.combined_product_count ?? null,
          combinedWeightedSov: attrs.combined_weighted_sov ?? null,
          combinedBasicSov: attrs.combined_basic_sov ?? null,
          combinedAveragePrice: attrs.combined_average_price ?? null,
          combinedAveragePosition: attrs.combined_average_position ?? null,
          organicProductCount: attrs.organic_product_count ?? null,
          organicWeightedSov: attrs.organic_weighted_sov ?? null,
          sponsoredProductCount: attrs.sponsored_product_count ?? null,
          sponsoredWeightedSov: attrs.sponsored_weighted_sov ?? null
        });
      }
    }

    return {
      output: {
        keyword: ctx.input.keyword,
        searchVolume30Day,
        medianPpcBid,
        productCount,
        brands
      },
      message: `Analyzed share of voice for keyword "${ctx.input.keyword}": **${brands.length}** brands found${searchVolume30Day ? `, 30-day search volume: **${searchVolume30Day}**` : ''}.`
    };
  })
  .build();
