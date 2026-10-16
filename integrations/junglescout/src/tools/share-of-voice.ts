import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  responseArray,
  responseNullableString,
  responseNumber,
  responseRecord,
  responseString
} from '../lib/response';
import { spec } from '../spec';

let brandShareSchema = z.object({
  organicBasicSov: z
    .number()
    .nullable()
    .optional()
    .describe('Organic unweighted share of voice'),
  organicAveragePosition: z
    .number()
    .nullable()
    .optional()
    .describe('Average organic result position'),
  organicAveragePrice: z
    .number()
    .nullable()
    .optional()
    .describe('Average organic product price'),
  sponsoredBasicSov: z
    .number()
    .nullable()
    .optional()
    .describe('Sponsored unweighted share of voice'),
  sponsoredAveragePosition: z
    .number()
    .nullable()
    .optional()
    .describe('Average sponsored result position'),
  sponsoredAveragePrice: z
    .number()
    .nullable()
    .optional()
    .describe('Average sponsored product price'),
  brandName: z.string().describe('Name of the brand'),
  combinedProductCount: z
    .number()
    .nullable()
    .describe('Total products across organic and sponsored results'),
  combinedWeightedSov: z
    .number()
    .nullable()
    .describe('Combined weighted share of voice fraction'),
  combinedBasicSov: z.number().nullable().describe('Combined basic share of voice fraction'),
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
    .describe('Organic weighted share of voice fraction'),
  sponsoredProductCount: z.number().nullable().describe('Number of sponsored products'),
  sponsoredWeightedSov: z
    .number()
    .nullable()
    .describe('Sponsored weighted share of voice fraction')
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
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response including native attributes and metadata'),
      updatedAt: z.string().nullable().optional().describe('Data collection timestamp'),
      topAsins: z
        .array(
          z.object({
            asin: z.string(),
            name: z.string().nullable(),
            brand: z.string().nullable(),
            clicks: z.number().nullable(),
            conversions: z.number().nullable(),
            conversionRate: z.number().nullable()
          })
        )
        .nullable()
        .optional()
        .describe('Top products by clicks with previous-week conversions'),
      topAsinsModelStartDate: z
        .string()
        .nullable()
        .optional()
        .describe('Start date of top product performance data'),
      topAsinsModelEndDate: z
        .string()
        .nullable()
        .optional()
        .describe('End date of top product performance data'),
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

    let resource = responseRecord(result.data, 'share of voice resource');
    let attrs = responseRecord(resource.attributes, 'share of voice attributes');
    let searchVolume30Day = responseNumber(
      attrs.estimated_30_day_search_volume,
      '30-day search volume'
    );
    let medianPpcBid = responseNumber(
      attrs.exact_suggested_bid_median ?? attrs.median_ppc_bid,
      'median PPC bid'
    );
    let productCount = responseNumber(attrs.product_count, 'product count');
    let brands = responseArray(attrs.brands, 'brand share of voice data').map(value => {
      let brand = responseRecord(value, 'brand share of voice');
      return {
        brandName: responseString(brand.brand, 'brand name'),
        combinedProductCount: responseNumber(
          brand.combined_products ?? brand.combined_product_count,
          'combined product count'
        ),
        combinedWeightedSov: responseNumber(
          brand.combined_weighted_sov,
          'combined weighted share of voice'
        ),
        combinedBasicSov: responseNumber(
          brand.combined_basic_sov,
          'combined basic share of voice'
        ),
        combinedAveragePrice: responseNumber(
          brand.combined_average_price,
          'combined average price'
        ),
        combinedAveragePosition: responseNumber(
          brand.combined_average_position,
          'combined average position'
        ),
        organicProductCount: responseNumber(
          brand.organic_products ?? brand.organic_product_count,
          'organic product count'
        ),
        organicWeightedSov: responseNumber(
          brand.organic_weighted_sov,
          'organic weighted share of voice'
        ),
        sponsoredProductCount: responseNumber(
          brand.sponsored_products ?? brand.sponsored_product_count,
          'sponsored product count'
        ),
        sponsoredWeightedSov: responseNumber(
          brand.sponsored_weighted_sov,
          'sponsored weighted share of voice'
        ),
        organicBasicSov: responseNumber(
          brand.organic_basic_sov,
          'organic basic share of voice'
        ),
        organicAveragePosition: responseNumber(
          brand.organic_average_position,
          'organic average position'
        ),
        organicAveragePrice: responseNumber(
          brand.organic_average_price,
          'organic average price'
        ),
        sponsoredBasicSov: responseNumber(
          brand.sponsored_basic_sov,
          'sponsored basic share of voice'
        ),
        sponsoredAveragePosition: responseNumber(
          brand.sponsored_average_position,
          'sponsored average position'
        ),
        sponsoredAveragePrice: responseNumber(
          brand.sponsored_average_price,
          'sponsored average price'
        )
      };
    });
    let topAsins =
      attrs.top_asins == null
        ? null
        : responseArray(attrs.top_asins, 'top ASINs').map(value => {
            let item = responseRecord(value, 'top ASIN');
            return {
              asin: responseString(item.asin, 'top product ASIN'),
              name: responseNullableString(item.name, 'top product name'),
              brand: responseNullableString(item.brand, 'top product brand'),
              clicks: responseNumber(item.clicks, 'top product clicks'),
              conversions: responseNumber(item.conversions, 'top product conversions'),
              conversionRate: responseNumber(
                item.conversion_rate,
                'top product conversion rate'
              )
            };
          });

    return {
      output: {
        raw: result,
        updatedAt: responseNullableString(attrs.updated_at, 'share of voice update timestamp'),
        topAsins,
        topAsinsModelStartDate: responseNullableString(
          attrs.top_asins_model_start_date,
          'performance start date'
        ),
        topAsinsModelEndDate: responseNullableString(
          attrs.top_asins_model_end_date,
          'performance end date'
        ),
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
