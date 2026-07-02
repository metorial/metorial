import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let amazonSearch = SlateTool.create(spec, {
  name: 'Amazon Product Search',
  key: 'amazon_search',
  description: `Search Amazon products or look up a specific product by ASIN. Returns structured JSON with product details including title, price, ratings, images, and more. Supports multiple Amazon domains and languages.`,
  instructions: [
    'Provide a query to search for products, or an asin to look up a specific product.',
    'If both query and asin are provided, the ASIN lookup takes priority.',
    'Use domain to specify the Amazon marketplace (e.g., "amazon.com", "amazon.co.uk", "amazon.de").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query for Amazon products'),
      asin: z
        .string()
        .optional()
        .describe('Amazon Standard Identification Number for a specific product lookup'),
      domain: z
        .string()
        .optional()
        .describe('Amazon domain (e.g., "amazon.com", "amazon.co.uk", "amazon.de")'),
      language: z.string().optional().describe('Language code for results'),
      countryCode: z
        .string()
        .optional()
        .describe('Two-letter country code for localized results'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type to emulate'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Sort order for search results (e.g., "price-asc-rank", "price-desc-rank", "review-rank", "date-desc-rank")'
        ),
      minPrice: z.number().optional().describe('Minimum price filter'),
      maxPrice: z.number().optional().describe('Maximum price filter'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Structured Amazon product data as JSON')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.asin) {
      let result = await client.amazonProduct({
        asin: ctx.input.asin,
        domain: ctx.input.domain,
        language: ctx.input.language,
        countryCode: ctx.input.countryCode,
        device: ctx.input.device
      });

      return {
        output: { results: result },
        message: `Retrieved Amazon product details for ASIN **${ctx.input.asin}**.`
      };
    }

    if (!ctx.input.query) {
      throw new Error('Either query or asin must be provided');
    }

    let result = await client.amazonSearch({
      query: ctx.input.query,
      domain: ctx.input.domain,
      language: ctx.input.language,
      countryCode: ctx.input.countryCode,
      device: ctx.input.device,
      sortBy: ctx.input.sortBy,
      minPrice: ctx.input.minPrice,
      maxPrice: ctx.input.maxPrice,
      page: ctx.input.page
    });

    return {
      output: { results: result },
      message: `Amazon search completed for **"${ctx.input.query}"**.`
    };
  });
