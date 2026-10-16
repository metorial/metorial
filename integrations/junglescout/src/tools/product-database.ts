import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  responseCollection,
  responseNullableString,
  responseNumber,
  responsePagination,
  responseString
} from '../lib/response';
import { spec } from '../spec';

let productSchema = z.object({
  id: z.string().optional().describe('Provider resource ID including marketplace'),
  asin: z.string().describe('Amazon Standard Identification Number'),
  title: z.string().nullable().describe('Product title'),
  brand: z.string().nullable().describe('Product brand name'),
  category: z.string().nullable().describe('Primary product category'),
  price: z.number().nullable().describe('Current product price in marketplace currency'),
  rank: z.number().nullable().describe('Best Sellers Rank'),
  sales: z.number().nullable().describe('Estimated monthly sales units (last 30 days)'),
  revenue: z.number().nullable().describe('Estimated monthly revenue (last 30 days)'),
  reviews: z.number().nullable().describe('Number of product reviews'),
  rating: z.number().nullable().describe('Average product rating (0-5)'),
  imageUrl: z.string().nullable().describe('Product image URL'),
  sellerType: z.string().nullable().describe('Seller type (amz, fba, fbm)'),
  lqs: z.number().nullable().describe('Provider Listing Quality Score'),
  weight: z.number().nullable().describe('Product weight'),
  numberOfSellers: z.number().nullable().describe('Number of active sellers'),
  feeBreakdown: z.any().nullable().describe('Amazon fee breakdown details'),
  updatedAt: z.string().nullable().describe('Last data update timestamp')
});

export let productDatabaseTool = SlateTool.create(spec, {
  name: 'Search Product Database',
  key: 'search_product_database',
  description: `Search the Jungle Scout product database using various filters to find Amazon products matching specific criteria. Returns product details including sales estimates, pricing, rankings, reviews, and seller information. Use this for **product research**, discovering market opportunities, and analyzing competitive landscape across Amazon categories.`,
  instructions: [
    'Use keyword filters to search by product title or ASIN.',
    'Combine category, price, rank, sales, and other filters for precise targeting.',
    'Sort by different metrics to find top performers or opportunities.'
  ],
  constraints: ['Maximum page size is 100 results.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeKeywords: z
        .array(z.string())
        .optional()
        .describe('Keywords or ASINs to include in product title search'),
      excludeKeywords: z
        .array(z.string())
        .optional()
        .describe('Keywords to exclude from results'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Amazon product categories to filter by (marketplace-specific)'),
      productTiers: z
        .array(z.enum(['oversize', 'standard']))
        .optional()
        .describe('Product size tiers to include'),
      sellerTypes: z
        .array(z.enum(['amz', 'fba', 'fbm']))
        .optional()
        .describe('Seller types to include'),
      excludeTopBrands: z.boolean().optional().describe('Exclude products from top brands'),
      excludeUnavailableProducts: z
        .boolean()
        .optional()
        .describe('Exclude currently unavailable products'),
      minUpdatedAt: z
        .string()
        .optional()
        .describe('Earliest product update date (YYYY-MM-DD)'),
      maxUpdatedAt: z.string().optional().describe('Latest product update date (YYYY-MM-DD)'),
      minPrice: z.number().optional().describe('Minimum product price'),
      maxPrice: z.number().optional().describe('Maximum product price'),
      minNet: z.number().optional().describe('Minimum net revenue after fees'),
      maxNet: z.number().optional().describe('Maximum net revenue after fees'),
      minRank: z.number().optional().describe('Minimum Best Sellers Rank'),
      maxRank: z.number().optional().describe('Maximum Best Sellers Rank'),
      minSales: z.number().optional().describe('Minimum estimated monthly sales'),
      maxSales: z.number().optional().describe('Maximum estimated monthly sales'),
      minRevenue: z.number().optional().describe('Minimum estimated monthly revenue'),
      maxRevenue: z.number().optional().describe('Maximum estimated monthly revenue'),
      minReviews: z.number().optional().describe('Minimum number of reviews'),
      maxReviews: z.number().optional().describe('Maximum number of reviews'),
      minRating: z.number().optional().describe('Minimum average rating (0-5)'),
      maxRating: z.number().optional().describe('Maximum average rating (0-5)'),
      minWeight: z.number().optional().describe('Minimum product weight'),
      maxWeight: z.number().optional().describe('Maximum product weight'),
      minSellers: z.number().optional().describe('Minimum number of sellers'),
      maxSellers: z.number().optional().describe('Maximum number of sellers'),
      minLqs: z.number().optional().describe('Minimum listing quality filter (1-10)'),
      maxLqs: z.number().optional().describe('Maximum listing quality filter (1-10)'),
      sort: z
        .enum([
          'name',
          '-name',
          'category',
          '-category',
          'revenue',
          '-revenue',
          'sales',
          '-sales',
          'price',
          '-price',
          'rank',
          '-rank',
          'reviews',
          '-reviews',
          'lqs',
          '-lqs',
          'sellers',
          '-sellers'
        ])
        .optional()
        .describe('Sort field (prefix with - for descending)'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100)'),
      pageCursor: z.string().optional().describe('Pagination cursor for fetching next page')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response including native attributes and metadata'),
      products: z.array(productSchema).describe('List of matching products'),
      totalItems: z.number().nullable().describe('Total number of matching products'),
      nextPageCursor: z
        .string()
        .nullable()
        .describe('Cursor for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      marketplace: ctx.config.marketplace,
      apiType: ctx.config.apiType
    });

    let result = await client.productDatabase({
      includeKeywords: ctx.input.includeKeywords,
      excludeKeywords: ctx.input.excludeKeywords,
      categories: ctx.input.categories,
      productTiers: ctx.input.productTiers,
      sellerTypes: ctx.input.sellerTypes,
      excludeTopBrands: ctx.input.excludeTopBrands,
      excludeUnavailableProducts: ctx.input.excludeUnavailableProducts,
      minUpdatedAt: ctx.input.minUpdatedAt,
      maxUpdatedAt: ctx.input.maxUpdatedAt,
      minPrice: ctx.input.minPrice,
      maxPrice: ctx.input.maxPrice,
      minNet: ctx.input.minNet,
      maxNet: ctx.input.maxNet,
      minRank: ctx.input.minRank,
      maxRank: ctx.input.maxRank,
      minSales: ctx.input.minSales,
      maxSales: ctx.input.maxSales,
      minRevenue: ctx.input.minRevenue,
      maxRevenue: ctx.input.maxRevenue,
      minReviews: ctx.input.minReviews,
      maxReviews: ctx.input.maxReviews,
      minRating: ctx.input.minRating,
      maxRating: ctx.input.maxRating,
      minWeight: ctx.input.minWeight,
      maxWeight: ctx.input.maxWeight,
      minSellers: ctx.input.minSellers,
      maxSellers: ctx.input.maxSellers,
      minLqs: ctx.input.minLqs,
      maxLqs: ctx.input.maxLqs,
      sort: ctx.input.sort,
      pagination: {
        pageSize: ctx.input.pageSize,
        pageCursor: ctx.input.pageCursor
      }
    });

    let products = responseCollection(result).map(item => ({
      id: item.id,
      asin: responseString(
        item.id.includes('/') ? item.id.slice(item.id.indexOf('/') + 1) : item.id,
        'product ASIN'
      ),
      title: responseNullableString(item.attributes.title, 'title'),
      brand: responseNullableString(item.attributes.brand, 'brand'),
      category: responseNullableString(item.attributes.category, 'category'),
      price: responseNumber(item.attributes.price, 'price'),
      rank: responseNumber(
        item.attributes.product_rank ?? item.attributes.rank,
        'product rank'
      ),
      sales: responseNumber(
        item.attributes.approximate_30_day_units_sold ?? item.attributes.sales,
        'monthly units sold'
      ),
      revenue: responseNumber(
        item.attributes.approximate_30_day_revenue ?? item.attributes.revenue,
        'monthly revenue'
      ),
      reviews: responseNumber(item.attributes.reviews, 'reviews'),
      rating: responseNumber(item.attributes.rating, 'rating'),
      imageUrl: responseNullableString(item.attributes.image_url, 'image_url'),
      sellerType: responseNullableString(item.attributes.seller_type, 'seller_type'),
      lqs: responseNumber(
        item.attributes.listing_quality_score ?? item.attributes.lqs,
        'listing quality score'
      ),
      weight: responseNumber(
        item.attributes.weight_value ?? item.attributes.weight,
        'product weight'
      ),
      numberOfSellers: responseNumber(item.attributes.number_of_sellers, 'number_of_sellers'),
      feeBreakdown: item.attributes.fee_breakdown ?? null,
      updatedAt: responseNullableString(item.attributes.updated_at, 'updated_at')
    }));

    let { totalItems, nextPageCursor } = responsePagination(result);

    return {
      output: {
        raw: result,
        products,
        totalItems,
        nextPageCursor
      },
      message: `Found **${products.length}** products${totalItems ? ` (${totalItems} total)` : ''} matching the search criteria.`
    };
  })
  .build();
