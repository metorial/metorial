import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireHeadoutId, requireHeadoutText } from '../lib/response';
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
        .describe('Override default language (EN, ES, FR, IT, DE, PT, NL, PL)'),
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
      raw: z.unknown().optional().describe('Complete provider response'),
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
      ...p,
      productId: requireHeadoutId(p?.id ?? p?.productId, 'product ID'),
      name: requireHeadoutText(p.name, 'product name'),
      url: p.url ?? p.canonicalUrl ?? undefined,
      cityCode: p.city?.code ?? p.cityCode,
      imageUrl:
        (typeof p.image === 'string' ? p.image : p.image?.url) ??
        p.imageUrl ??
        p.images?.[0]?.url ??
        p.media?.[0]?.url ??
        undefined,
      neighbourhood: p.neighbourhood ?? undefined,
      category:
        (p.category ?? p.primaryCategory)
          ? {
              categoryId:
                (p.category ?? p.primaryCategory).id != null
                  ? requireHeadoutId((p.category ?? p.primaryCategory).id, 'category ID')
                  : undefined,
              name: (p.category ?? p.primaryCategory).name ?? undefined,
              cityCode:
                (p.category ?? p.primaryCategory).cityCode ?? p.city?.code ?? p.cityCode
            }
          : undefined,
      ratingCumulative:
        p.ratingCumulative ??
        p.rating ??
        (p.reviewsSummary
          ? {
              avg: p.reviewsSummary.averageRating ?? undefined,
              count: p.reviewsSummary.ratingsCount ?? undefined
            }
          : undefined),
      pricing:
        (p.listingPrice ?? p.pricing)
          ? {
              type: (p.listingPrice ?? p.pricing).type ?? p.pricing?.profileType,
              currencyCode: (p.listingPrice ?? p.pricing).currencyCode ?? p.pricing?.currency,
              minimumPrice:
                (p.listingPrice ?? p.pricing).minimumPrice ??
                (p.pricing?.headoutSellingPrice != null
                  ? {
                      originalPrice: p.pricing.headoutSellingPrice,
                      finalPrice: p.pricing.headoutSellingPrice
                    }
                  : undefined),
              bestDiscount: (p.listingPrice ?? p.pricing).bestDiscount ?? undefined
            }
          : undefined
    }));

    return {
      output: {
        products,
        raw: result,
        total: result.total,
        nextOffset: result.nextOffset ?? undefined
      },
      message: `Found ${result.total ?? products.length} products in **${ctx.input.cityCode}**. Showing ${products.length} results${ctx.input.offset ? ` starting from offset ${ctx.input.offset}` : ''}.`
    };
  })
  .build();
