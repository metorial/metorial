import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let productListingSchema = z
  .object({
    productId: z.string().describe('Unique product identifier'),
    name: z.string().describe('Product name'),
    url: z.string().optional().describe('Product URL on Headout'),
    cityCode: z.string().optional().describe('City code where the product is available'),
    imageUrl: z.string().optional().describe('Primary image URL'),
    neighbourhood: z.string().optional().describe('Neighbourhood or area name'),
    category: z
      .object({
        categoryId: z.string().optional(),
        name: z.string().optional(),
        cityCode: z.string().optional()
      })
      .optional()
      .describe('Product category'),
    ratingCumulative: z
      .object({
        avg: z.number().optional(),
        count: z.number().optional()
      })
      .optional()
      .describe('Cumulative rating'),
    pricing: z
      .object({
        type: z.string().optional().describe('PER_PERSON or PER_GROUP'),
        currencyCode: z.string().optional(),
        minimumPrice: z
          .object({
            originalPrice: z.number().optional(),
            finalPrice: z.number().optional()
          })
          .optional(),
        bestDiscount: z.number().optional()
      })
      .optional()
      .describe('Pricing summary')
  })
  .passthrough();

export let searchProducts = SlateTool.create(spec, {
  name: 'Search Products',
  key: 'search_products',
  description: `Search for tours, activities, tickets, and experiences available on Headout.
Filter by city, category, subcategory, collection, or campaign. Results are ordered by best-selling and trending patterns.
Returns a paginated list of product listings with names, pricing, ratings, and URLs.`,
  instructions: [
    'The cityCode parameter is required — use uppercase codes like NEW_YORK, DUBAI, PARIS, LONDON, ROME.',
    'Use the "List Cities" tool first if you need to discover available city codes.',
    'Use categoryId, subCategoryId, or collectionId to narrow results. Obtain these IDs from the respective listing tools.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cityCode: z.string().describe('City code (e.g., NEW_YORK, DUBAI, PARIS, LONDON, ROME)'),
      categoryId: z.string().optional().describe('Filter by category ID'),
      subCategoryId: z.string().optional().describe('Filter by subcategory ID'),
      collectionId: z.string().optional().describe('Filter by collection ID'),
      campaignName: z.string().optional().describe('Filter by campaign name'),
      languageCode: z
        .string()
        .optional()
        .describe('Override default language (EN, ES, FR, IT, DE, PT, NL)'),
      currencyCode: z
        .string()
        .optional()
        .describe('Override default currency (ISO 4217, e.g., USD, EUR)'),
      offset: z.number().optional().describe('Pagination offset (default: 0)'),
      limit: z.number().optional().describe('Number of results per page (default: 20)')
    })
  )
  .output(
    z.object({
      products: z.array(productListingSchema).describe('List of matching products'),
      total: z.number().optional().describe('Total number of matching products'),
      nextOffset: z.number().optional().describe('Offset for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      languageCode: ctx.config.languageCode,
      currencyCode: ctx.config.currencyCode
    });

    let result = await client.searchProducts({
      cityCode: ctx.input.cityCode,
      categoryId: ctx.input.categoryId,
      subCategoryId: ctx.input.subCategoryId,
      collectionId: ctx.input.collectionId,
      campaignName: ctx.input.campaignName,
      languageCode: ctx.input.languageCode,
      currencyCode: ctx.input.currencyCode,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let products = (result.items ?? result.products ?? []).map((p: any) => ({
      productId: String(p.id ?? p.productId ?? ''),
      name: p.name ?? '',
      url: p.url,
      cityCode: p.city?.code ?? p.cityCode,
      imageUrl: p.image?.url ?? p.imageUrl,
      neighbourhood: p.neighbourhood,
      category: p.category
        ? {
            categoryId: String(p.category.id ?? ''),
            name: p.category.name,
            cityCode: p.category.cityCode
          }
        : undefined,
      ratingCumulative: p.ratingCumulative ?? p.rating,
      pricing: p.pricing
        ? {
            type: p.pricing.type,
            currencyCode: p.pricing.currencyCode,
            minimumPrice: p.pricing.minimumPrice,
            bestDiscount: p.pricing.bestDiscount
          }
        : undefined
    }));

    return {
      output: {
        products,
        total: result.total,
        nextOffset: result.nextOffset
      },
      message: `Found ${result.total ?? products.length} products in **${ctx.input.cityCode}**. Showing ${products.length} results${ctx.input.offset ? ` starting from offset ${ctx.input.offset}` : ''}.`
    };
  })
  .build();
