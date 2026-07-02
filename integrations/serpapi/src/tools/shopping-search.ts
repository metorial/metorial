import { SlateTool } from 'slates';
import { z } from 'zod';
import { SerpApiClient } from '../lib/client';
import { spec } from '../spec';

let productResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Product title'),
  link: z.string().optional().describe('Product URL'),
  productId: z.string().optional().describe('Product identifier (ASIN for Amazon, etc.)'),
  price: z.string().optional().describe('Product price as displayed'),
  extractedPrice: z.number().optional().describe('Numeric price value'),
  rating: z.number().optional().describe('Product rating'),
  reviews: z.number().optional().describe('Number of reviews'),
  source: z.string().optional().describe('Seller/source name'),
  thumbnailUrl: z.string().optional().describe('Product thumbnail URL'),
  delivery: z.string().optional().describe('Delivery information'),
  isPrime: z.boolean().optional().describe('Whether the product has Prime shipping (Amazon)')
});

export let shoppingSearchTool = SlateTool.create(spec, {
  name: 'Shopping Search',
  key: 'shopping_search',
  description: `Search product listings across Google Shopping, Amazon, Walmart, eBay, and Home Depot. Returns product titles, prices, ratings, reviews, seller information, and availability. Useful for price comparison and product research.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Product search query'),
      engine: z
        .enum(['google_shopping', 'amazon', 'walmart', 'ebay', 'home_depot'])
        .default('google_shopping')
        .describe('Shopping engine to use'),
      location: z.string().optional().describe('Location for geo-targeted results'),
      language: z.string().optional().describe('Language code'),
      country: z.string().optional().describe('Country code'),
      amazonDomain: z
        .string()
        .optional()
        .describe('Amazon domain (e.g., "amazon.co.uk"). Only used with amazon engine.'),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination (1-indexed for Amazon/Walmart)'),
      sortBy: z.string().optional().describe('Sort order parameter'),
      device: z
        .enum(['desktop', 'tablet', 'mobile'])
        .optional()
        .describe('Device type to emulate'),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      products: z.array(productResultSchema).describe('Product search results'),
      totalResults: z.number().optional().describe('Total number of results found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token });

    let params: Record<string, any> = {
      engine: ctx.input.engine
    };

    if (ctx.input.engine === 'amazon') {
      params.k = ctx.input.query;
      if (ctx.input.amazonDomain) params.amazon_domain = ctx.input.amazonDomain;
    } else {
      params.q = ctx.input.query;
    }

    if (ctx.input.location) params.location = ctx.input.location;
    if (ctx.input.language) params.hl = ctx.input.language;
    if (ctx.input.country) params.gl = ctx.input.country;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.sortBy) params.sort_by = ctx.input.sortBy;
    if (ctx.input.device) params.device = ctx.input.device;
    if (ctx.input.noCache) params.no_cache = ctx.input.noCache;

    let data = await client.search(params);

    let rawResults = data.shopping_results || data.organic_results || [];
    let products = rawResults.map((r: any) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      productId: r.asin || r.product_id,
      price: r.price || r.extracted_price?.toString(),
      extractedPrice: r.extracted_price,
      rating: r.rating,
      reviews: r.reviews,
      source: r.source,
      thumbnailUrl: r.thumbnail,
      delivery: r.delivery,
      isPrime: r.is_prime
    }));

    let totalResults = data.search_information?.total_results;

    return {
      output: {
        products,
        totalResults
      },
      message: `Shopping search for "${ctx.input.query}" on ${ctx.input.engine} returned **${products.length}** products.`
    };
  })
  .build();
