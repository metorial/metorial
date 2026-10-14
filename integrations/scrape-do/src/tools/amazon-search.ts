import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapeDoClient, validateWholeNumber } from '../lib/client';
import { spec } from '../spec';

export let amazonSearch = SlateTool.create(spec, {
  name: 'Amazon Search',
  key: 'amazon_search',
  description: `Search Amazon and get structured JSON results with product listings and rankings. Returns product details including ASIN, title, price, rating, review count, Prime eligibility, and sponsored status. Supports international Amazon marketplaces with pagination and ZIP code-based location targeting.`,
  instructions: [
    'Use geocode to specify the Amazon marketplace (e.g., "us", "gb", "de").',
    'Use page for pagination (starts at 1).',
    'Pass keyword as plain text; special characters are encoded automatically.'
  ],
  constraints: ['The Amazon Scraper API has a concurrency limit of 1 request per token.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Search keyword or query'),
      geocode: z
        .string()
        .describe('Amazon marketplace country code (e.g., "us", "gb", "de", "fr", "jp")'),
      zipcode: z.string().optional().describe('Postal/ZIP code for location-specific results'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      countryName: z
        .string()
        .optional()
        .describe('Country-level delivery destination; use instead of zipcode'),
      currency: z
        .string()
        .optional()
        .describe('ISO 4217 display currency, such as USD or EUR'),
      language: z
        .string()
        .optional()
        .describe('Language code in ISO 639-1 uppercase format (e.g., "EN", "DE")'),
      includeHtml: z.boolean().optional().describe('Include raw HTML in the response'),
      super: z
        .boolean()
        .optional()
        .describe('Enable residential proxies for higher success rates (costs 10x credits)')
    })
  )
  .output(
    z.object({
      keyword: z.string().optional().describe('The search keyword used'),
      page: z.number().optional().describe('Current page number'),
      totalResults: z.string().optional().describe('Total number of results found'),
      products: z
        .array(z.any())
        .optional()
        .describe('Array of product listings with ASIN, title, price, rating, etc.'),
      rawResponse: z.any().describe('Full response from Amazon search API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScrapeDoClient(ctx.auth.token);
    let input = ctx.input;
    if (input.zipcode && input.countryName) {
      throw createApiServiceError('Choose either zipcode or countryName, not both.');
    }

    validateWholeNumber('page', input.page, 1);
    let results = await client.amazonSearch({
      keyword: input.keyword,
      geocode: input.geocode,
      zipcode: input.zipcode,
      countryName: input.countryName,
      currency: input.currency,
      page: input.page,
      language: input.language,
      includeHtml: input.includeHtml,
      super: input.super
    });

    let products = Array.isArray(results.products) ? results.products : undefined;
    let totalResults =
      typeof results.totalResults === 'string' ? results.totalResults : undefined;

    return {
      output: {
        keyword: typeof results.keyword === 'string' ? results.keyword : input.keyword,
        page: typeof results.page === 'number' ? results.page : (input.page ?? 1),
        totalResults: totalResults,
        products: products ?? [],
        rawResponse: results
      },
      message: `Amazon search for **"${input.keyword}"** on **${input.geocode}** returned **${products?.length || 0}** products${totalResults ? ` (${totalResults} total)` : ''}.`
    };
  })
  .build();
