import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let walmartSearch = SlateTool.create(spec, {
  name: 'Walmart Product Search',
  key: 'walmart_search',
  description: `Search Walmart products or look up a specific product by ID. Returns structured JSON with product details including title, price, ratings, availability, and more. Supports price filters, sorting, and fulfillment options.`,
  instructions: [
    'Provide a query to search for products, or a productId to look up a specific product.',
    'If both query and productId are provided, the product lookup takes priority.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query for Walmart products'),
      productId: z
        .string()
        .optional()
        .describe('Walmart product ID for a specific product lookup'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Sort order for search results (e.g., "best_match", "price_low", "price_high", "best_seller", "rating_high")'
        ),
      minPrice: z.number().optional().describe('Minimum price filter'),
      maxPrice: z.number().optional().describe('Maximum price filter'),
      fulfillmentType: z
        .string()
        .optional()
        .describe('Fulfillment type filter (e.g., "pickup", "shipping")'),
      fulfillmentSpeed: z
        .string()
        .optional()
        .describe('Fulfillment speed filter (e.g., "today", "tomorrow", "twoDay")'),
      domain: z.string().optional().describe('Walmart domain (e.g., "walmart.com")'),
      page: z.number().optional().describe('Page number for pagination'),
      deliveryZip: z
        .string()
        .optional()
        .describe('ZIP code for delivery availability (product lookup only)'),
      storeId: z
        .string()
        .optional()
        .describe('Walmart store ID for in-store availability (product lookup only)')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Structured Walmart product data as JSON')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.productId) {
      let result = await client.walmartProduct({
        productId: ctx.input.productId,
        deliveryZip: ctx.input.deliveryZip,
        storeId: ctx.input.storeId
      });

      return {
        output: { results: result },
        message: `Retrieved Walmart product details for ID **${ctx.input.productId}**.`
      };
    }

    if (!ctx.input.query) {
      throw new Error('Either query or productId must be provided');
    }

    let result = await client.walmartSearch({
      query: ctx.input.query,
      sortBy: ctx.input.sortBy,
      minPrice: ctx.input.minPrice,
      maxPrice: ctx.input.maxPrice,
      fulfillmentType: ctx.input.fulfillmentType,
      fulfillmentSpeed: ctx.input.fulfillmentSpeed,
      domain: ctx.input.domain,
      page: ctx.input.page
    });

    return {
      output: { results: result },
      message: `Walmart search completed for **"${ctx.input.query}"**.`
    };
  });
