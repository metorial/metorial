import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let amazonSearch = SlateTool.create(spec, {
  name: 'Amazon Data Extraction',
  key: 'amazon_data_extraction',
  description: `Extract data from Amazon in real time. Supports scraping search result pages, product details by ASIN, and product reviews. Use premium proxies for improved success on difficult pages.`,
  instructions: [
    'For search results, provide a full encoded Amazon search URL.',
    'For product details, provide the product ASIN (Amazon Standard Identification Number).',
    'For reviews, provide the product ID and optionally a page number.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['search', 'product', 'reviews'])
        .describe('Type of Amazon data to extract'),
      searchUrl: z
        .string()
        .optional()
        .describe('Encoded Amazon search page URL (required for "search" type)'),
      asin: z
        .string()
        .optional()
        .describe('Amazon Standard Identification Number (required for "product" type)'),
      productId: z
        .string()
        .optional()
        .describe('Amazon product ID (required for "reviews" type)'),
      amazonDomain: z
        .string()
        .optional()
        .describe('Amazon domain TLD (e.g., "com", "co.uk", "de"). Defaults to "com".'),
      premium: z
        .boolean()
        .optional()
        .describe('Use premium proxies for improved success. Costs more credits.'),
      country: z
        .string()
        .optional()
        .describe('Proxy country (only used with premium). ISO 3166 format.'),
      excludeSponsored: z
        .boolean()
        .optional()
        .describe('Exclude sponsored results from search results'),
      reviewPage: z.string().optional().describe('Page number for reviews (e.g., "1", "2")')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Amazon data extraction results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data: any;
    let message: string;

    switch (ctx.input.type) {
      case 'search':
        if (!ctx.input.searchUrl) throw new Error('searchUrl is required for Amazon search');
        data = await client.amazonSearch({
          url: ctx.input.searchUrl,
          premium: ctx.input.premium,
          country: ctx.input.country,
          excludeSponsored: ctx.input.excludeSponsored
        });
        message = `Extracted Amazon search results.`;
        break;

      case 'product':
        if (!ctx.input.asin) throw new Error('asin is required for Amazon product lookup');
        data = await client.amazonProduct({
          asin: ctx.input.asin,
          domain: ctx.input.amazonDomain,
          premium: ctx.input.premium,
          country: ctx.input.country
        });
        message = `Extracted Amazon product details for ASIN **${ctx.input.asin}**.`;
        break;

      case 'reviews':
        if (!ctx.input.productId) throw new Error('productId is required for Amazon reviews');
        data = await client.amazonReviews({
          productId: ctx.input.productId,
          page: ctx.input.reviewPage,
          domain: ctx.input.amazonDomain,
          premium: ctx.input.premium,
          country: ctx.input.country
        });
        message = `Extracted Amazon reviews for product **${ctx.input.productId}**.`;
        break;
    }

    return {
      output: { results: data },
      message: message!
    };
  })
  .build();
