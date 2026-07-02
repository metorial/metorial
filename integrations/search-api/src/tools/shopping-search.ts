import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let shoppingResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Product name'),
  link: z.string().optional().describe('Product page URL'),
  source: z.string().optional().describe('Seller/retailer name'),
  price: z.string().optional().describe('Product price as displayed'),
  extractedPrice: z.number().optional().describe('Parsed numeric price'),
  rating: z.number().optional().describe('Product rating'),
  reviewCount: z.number().optional().describe('Number of reviews'),
  thumbnail: z.string().optional().describe('Product thumbnail URL'),
  delivery: z.string().optional().describe('Delivery information'),
  onSale: z.boolean().optional().describe('Whether the product is on sale')
});

export let shoppingSearch = SlateTool.create(spec, {
  name: 'Google Shopping Search',
  key: 'shopping_search',
  description: `Search Google Shopping for product listings. Returns product details including pricing, ratings, reviews, seller info, and delivery options. Supports price range filtering, sale items, condition filtering, and sorting by price or rating.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Product search query'),
      location: z.string().optional().describe('Geographic location'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      language: z.string().optional().describe('Interface language code'),
      page: z.number().optional().describe('Results page number'),
      priceMin: z.number().optional().describe('Minimum price filter'),
      priceMax: z.number().optional().describe('Maximum price filter'),
      onSaleOnly: z.boolean().optional().describe('Only show sale items'),
      condition: z.enum(['new', 'used']).optional().describe('Product condition filter'),
      freeDelivery: z.boolean().optional().describe('Only show items with free delivery'),
      sortBy: z
        .enum(['price_low_to_high', 'price_high_to_low', 'rating_high_to_low'])
        .optional()
        .describe('Sort order for results')
    })
  )
  .output(
    z.object({
      searchQuery: z.string().optional().describe('The query that was searched'),
      shoppingResults: z.array(shoppingResultSchema).describe('Product listings'),
      shoppingAds: z
        .array(shoppingResultSchema)
        .optional()
        .describe('Sponsored product listings'),
      currentPage: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.search({
      engine: 'google_shopping',
      q: ctx.input.query,
      location: ctx.input.location,
      gl: ctx.input.country,
      hl: ctx.input.language,
      page: ctx.input.page,
      price_min: ctx.input.priceMin,
      price_max: ctx.input.priceMax,
      is_on_sale: ctx.input.onSaleOnly ? true : undefined,
      condition: ctx.input.condition,
      is_free_delivery: ctx.input.freeDelivery ? true : undefined,
      sort_by: ctx.input.sortBy
    });

    let mapProduct = (p: any) => ({
      position: p.position,
      title: p.title,
      link: p.link,
      source: p.source,
      price: p.price,
      extractedPrice: p.extracted_price,
      rating: p.rating,
      reviewCount: p.reviews,
      thumbnail: p.thumbnail,
      delivery: p.delivery,
      onSale: p.on_sale
    });

    let shoppingResults = (data.shopping_results || []).map(mapProduct);
    let shoppingAds = (data.shopping_ads || []).map(mapProduct);

    return {
      output: {
        searchQuery: data.search_parameters?.q || ctx.input.query,
        shoppingResults,
        shoppingAds: shoppingAds.length > 0 ? shoppingAds : undefined,
        currentPage: data.pagination?.current
      },
      message: `Found ${shoppingResults.length} product${shoppingResults.length !== 1 ? 's' : ''} for "${ctx.input.query}".`
    };
  })
  .build();
