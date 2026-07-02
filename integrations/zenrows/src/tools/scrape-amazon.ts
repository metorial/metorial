import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeAmazon = SlateTool.create(spec, {
  name: 'Scrape Amazon',
  key: 'scrape_amazon',
  description: `Extract structured product data or search results from Amazon. Retrieve detailed product information by ASIN (product name, price, rating, images, description), or search Amazon's catalog by query to discover products with pricing, ratings, and availability.`,
  instructions: [
    'Use **action** "product" with an **asin** to get detailed product information.',
    'Use **action** "search" with a **query** to discover products matching a search term.',
    'Use the **country** parameter to access localized Amazon data (e.g. "us", "gb", "de", "fr").'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['product', 'search'])
        .describe('Whether to get a specific product by ASIN or search for products'),
      asin: z
        .string()
        .optional()
        .describe(
          'Amazon Standard Identification Number (e.g. "B07FZ8S74R"). Required for "product" action.'
        ),
      query: z
        .string()
        .optional()
        .describe('Search query to find products on Amazon. Required for "search" action.'),
      country: z
        .string()
        .optional()
        .describe('Country code for localized results (e.g. "us", "gb", "de", "fr", "jp")')
    })
  )
  .output(
    z.object({
      results: z
        .record(z.string(), z.unknown())
        .describe('Structured product data or search results from Amazon')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results: Record<string, unknown>;

    if (ctx.input.action === 'product') {
      if (!ctx.input.asin) {
        throw new Error('asin is required for the "product" action');
      }
      results = await client.getAmazonProduct({
        asin: ctx.input.asin,
        country: ctx.input.country
      });

      return {
        output: { results },
        message: `Retrieved Amazon product data for ASIN **${ctx.input.asin}**${ctx.input.country ? ` (country: ${ctx.input.country})` : ''}.`
      };
    } else {
      if (!ctx.input.query) {
        throw new Error('query is required for the "search" action');
      }
      results = await client.searchAmazon({
        query: ctx.input.query,
        country: ctx.input.country
      });

      return {
        output: { results },
        message: `Searched Amazon for **"${ctx.input.query}"**${ctx.input.country ? ` (country: ${ctx.input.country})` : ''}.`
      };
    }
  })
  .build();
