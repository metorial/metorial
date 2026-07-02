import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let shoppingResultSchema = z
  .object({
    position: z.number().optional().describe('Position in results'),
    title: z.string().optional().describe('Product title'),
    url: z.string().optional().describe('Product URL'),
    price: z.string().optional().describe('Product price'),
    source: z.string().optional().describe('Merchant/store name'),
    productId: z.string().optional().describe('Product ID for fetching details'),
    thumbnail: z.string().optional().describe('Product thumbnail URL'),
    rating: z.number().optional().describe('Product rating'),
    reviews: z.number().optional().describe('Number of reviews')
  })
  .passthrough();

let shoppingSearchResultSchema = z
  .object({
    query: z.record(z.string(), z.any()).optional().describe('Echo of query parameters'),
    shoppingResults: z
      .array(shoppingResultSchema)
      .optional()
      .describe('Shopping search results')
  })
  .passthrough();

export let shoppingSearch = SlateTool.create(spec, {
  name: 'Shopping Search',
  key: 'shopping_search',
  description: `Search Google Shopping for product listings. Returns product titles, prices, merchant names, ratings, and product IDs. Product IDs can be used with the **Get Shopping Product Details** tool to fetch detailed product information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Shopping search query string'),
      location: z.string().optional().describe('Location for geotargeted results'),
      language: z.string().optional().describe('Language code (hl), e.g. "en"'),
      country: z.string().optional().describe('Country code (gl), e.g. "us"'),
      numResults: z.number().optional().describe('Number of results to return'),
      start: z.number().optional().describe('Result offset for pagination')
    })
  )
  .output(shoppingSearchResultSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.search({
      q: ctx.input.query,
      tbm: 'shop',
      location: ctx.input.location,
      hl: ctx.input.language,
      gl: ctx.input.country,
      num: ctx.input.numResults,
      start: ctx.input.start
    });

    let shoppingResults = results.shopping_results ?? results.organic ?? [];

    return {
      output: {
        ...results,
        shoppingResults
      },
      message: `Found **${shoppingResults.length}** shopping results for "${ctx.input.query}".`
    };
  })
  .build();
