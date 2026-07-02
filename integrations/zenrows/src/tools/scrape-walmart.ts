import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeWalmart = SlateTool.create(spec, {
  name: 'Scrape Walmart',
  key: 'scrape_walmart',
  description: `Extract structured data from Walmart. Get detailed product information by SKU, search for products by query, or retrieve product reviews. Returns structured JSON with pricing, availability, ratings, images, and more.`,
  instructions: [
    'Use **action** "product" with a **sku** to get detailed product information.',
    'Use **action** "search" with a **query** to discover products.',
    'Use **action** "reviews" with a **sku** to get customer reviews and ratings.',
    'Use the **tld** parameter for different Walmart country sites (e.g. ".com", ".ca").'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['product', 'search', 'reviews'])
        .describe('Type of data to retrieve from Walmart'),
      sku: z
        .string()
        .optional()
        .describe(
          'Walmart product SKU/ID (numeric, 8-20 characters). Required for "product" and "reviews" actions.'
        ),
      query: z
        .string()
        .optional()
        .describe('Search query to find products on Walmart. Required for "search" action.'),
      tld: z
        .string()
        .optional()
        .describe('Top-level domain for the Walmart site (e.g. ".com", ".ca")')
    })
  )
  .output(
    z.object({
      results: z
        .record(z.string(), z.unknown())
        .describe('Structured product data, search results, or reviews from Walmart')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results: Record<string, unknown>;

    if (ctx.input.action === 'product') {
      if (!ctx.input.sku) {
        throw new Error('sku is required for the "product" action');
      }
      results = await client.getWalmartProduct({
        sku: ctx.input.sku,
        tld: ctx.input.tld
      });

      return {
        output: { results },
        message: `Retrieved Walmart product data for SKU **${ctx.input.sku}**.`
      };
    } else if (ctx.input.action === 'search') {
      if (!ctx.input.query) {
        throw new Error('query is required for the "search" action');
      }
      results = await client.searchWalmart({
        query: ctx.input.query,
        tld: ctx.input.tld
      });

      return {
        output: { results },
        message: `Searched Walmart for **"${ctx.input.query}"**.`
      };
    } else {
      if (!ctx.input.sku) {
        throw new Error('sku is required for the "reviews" action');
      }
      results = await client.getWalmartReviews({
        sku: ctx.input.sku,
        tld: ctx.input.tld
      });

      return {
        output: { results },
        message: `Retrieved reviews for Walmart product SKU **${ctx.input.sku}**.`
      };
    }
  })
  .build();
