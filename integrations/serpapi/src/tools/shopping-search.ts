import { SlateTool } from 'slates';
import { z } from 'zod';
import { receiptMessage, receiptOutput, SerpApiClient } from '../lib/client';
import { number, searchMetadataSchema, text } from '../lib/contracts';
import { searchParams } from '../lib/params';
import { spec } from '../spec';

let productResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Product title'),
  link: z.string().optional().describe('Product URL'),
  productId: z.string().optional().describe('Product identifier (ASIN for Amazon, etc.)'),
  priceRange: z
    .object({
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      minimumDisplay: z.string().optional(),
      maximumDisplay: z.string().optional()
    })
    .optional(),
  currency: z
    .string()
    .optional()
    .describe('Native offer currency when present; no inferred currency.'),
  deliveryDetails: z.unknown().optional(),
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
      async: z
        .boolean()
        .optional()
        .describe(
          'Submit asynchronously and return the native search ID/status. Not compatible with noCache or Ludicrous Speed accounts.'
        ),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      isComplete: z
        .boolean()
        .describe(
          'Whether native search status is Success; queued/processing receipts are incomplete.'
        ),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Native pagination metadata; follow native offsets/tokens without inferring a total.'
        ),
      searchMetadata: searchMetadataSchema.optional(),
      products: z.array(productResultSchema).describe('Product search results'),
      totalResults: z.number().optional().describe('Total number of results found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token, accountId: ctx.auth.accountId });

    let params = searchParams('shopping_search', ctx.input);

    let data = await client.search(params);

    let rawResults = data.shopping_results || data.organic_results || data.products || [];
    let products = rawResults.map((r: any) => ({
      position: r.position,
      title: r.title,
      link: r.link ?? r.product_page_url,
      productId: r.asin || r.product_id,
      price:
        text(r.price) ??
        text(r.price?.raw) ??
        (number(r.price) !== undefined ? String(r.price) : undefined),
      priceRange:
        r.price?.from || r.price?.to
          ? {
              minimum: number(r.price?.from?.extracted),
              maximum: number(r.price?.to?.extracted),
              minimumDisplay: text(r.price?.from?.raw),
              maximumDisplay: text(r.price?.to?.raw)
            }
          : undefined,
      currency: text(r.primary_offer?.currency),
      extractedPrice:
        number(r.extracted_price) ??
        number(r.price?.extracted) ??
        number(r.primary_offer?.offer_price) ??
        number(r.price),
      rating: r.rating,
      reviews: r.reviews,
      source: text(r.source) ?? text(r.seller_name) ?? text(r.brand),
      thumbnailUrl: text(r.thumbnail) ?? text(r.thumbnails?.[0]?.[0]),
      delivery:
        text(r.delivery) ??
        (Array.isArray(r.delivery) && r.delivery.every((v: unknown) => typeof v === 'string')
          ? r.delivery.join('; ')
          : undefined),
      deliveryDetails: r.delivery,
      isPrime: r.is_prime ?? r.prime
    }));

    let totalResults = data.search_information?.total_results;

    return {
      output: {
        ...receiptOutput(data),
        products,
        totalResults
      },
      message: receiptMessage(
        data,
        `Shopping search for "${ctx.input.query}" on ${ctx.input.engine} returned **${products.length}** products.`
      )
    };
  })
  .build();
