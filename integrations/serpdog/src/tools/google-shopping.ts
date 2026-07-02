import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let googleShopping = SlateTool.create(spec, {
  name: 'Google Shopping Search',
  key: 'google_shopping_search',
  description: `Search Google Shopping for products and prices. Also supports fetching detailed product information, online sellers, specifications, and product reviews using a Google Product ID.`,
  instructions: [
    'To get detailed product info, set `productId` (found in Google Shopping URLs as `/shopping/product/{productId}`).',
    'When fetching a product, set `includeOffers`, `includeSpecs`, or `includeReviews` to true to get that data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Shopping search query'),
      productId: z
        .string()
        .optional()
        .describe('Google Product ID for detailed product info (from Google Shopping URL)'),
      country: z
        .string()
        .optional()
        .describe('Country code in ISO 3166 Alpha-2 format. Defaults to "us".'),
      language: z.string().optional().describe('Language of results. Defaults to "en_us".'),
      numResults: z.number().optional().describe('Number of results per page'),
      page: z.number().optional().describe('Page offset (0, 10, 20, etc.)'),
      timeFilter: z
        .string()
        .optional()
        .describe('Time filter: "d" (day), "w" (week), "m" (month), "y" (year)'),
      safeSearch: z
        .enum(['active', 'off'])
        .optional()
        .describe('Safe search filter. Defaults to "off".'),
      includeOffers: z
        .boolean()
        .optional()
        .describe('Include product offers/sellers (when using productId)'),
      includeSpecs: z
        .boolean()
        .optional()
        .describe('Include product specifications (when using productId)'),
      includeReviews: z
        .boolean()
        .optional()
        .describe('Include product reviews (when using productId)'),
      filters: z
        .string()
        .optional()
        .describe('Sorting/filtering options for product offers or reviews')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Google Shopping or Product results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.productId) {
      let data = await client.googleProduct({
        productId: ctx.input.productId,
        gl: ctx.input.country,
        hl: ctx.input.language,
        page: ctx.input.page,
        offers: ctx.input.includeOffers ? 1 : undefined,
        specs: ctx.input.includeSpecs ? 1 : undefined,
        reviews: ctx.input.includeReviews ? 1 : undefined,
        filters: ctx.input.filters
      });

      return {
        output: { results: data },
        message: `Fetched product details for product ID **${ctx.input.productId}**.`
      };
    }

    if (!ctx.input.query) throw new Error('Either query or productId is required');

    let data = await client.googleShopping({
      q: ctx.input.query,
      gl: ctx.input.country,
      hl: ctx.input.language,
      num: ctx.input.numResults,
      page: ctx.input.page,
      duration: ctx.input.timeFilter,
      safe: ctx.input.safeSearch
    });

    return {
      output: { results: data },
      message: `Searched Google Shopping for **"${ctx.input.query}"**.`
    };
  })
  .build();
