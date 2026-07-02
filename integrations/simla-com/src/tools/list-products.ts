import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let offerSchema = z.object({
  offerId: z.number().optional(),
  externalId: z.string().optional(),
  name: z.string().optional(),
  article: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().optional(),
  purchasePrice: z.number().optional(),
  quantity: z.number().optional(),
  weight: z.number().optional(),
  images: z.array(z.string()).optional(),
  unit: z
    .object({
      code: z.string().optional(),
      name: z.string().optional(),
      sym: z.string().optional()
    })
    .optional(),
  properties: z.record(z.string(), z.any()).optional()
});

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Search and list products from the store catalog. Supports filtering by name, article, activity status, group, and more. Returns products with their trade offers (SKUs), images, and pricing.`,
  constraints: ['Maximum 100 results per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .object({
          ids: z.array(z.number()).optional().describe('Filter by product IDs'),
          active: z.boolean().optional().describe('Filter by active status'),
          name: z.string().optional().describe('Filter by product name (partial match)'),
          minPrice: z.number().optional().describe('Minimum price'),
          maxPrice: z.number().optional().describe('Maximum price'),
          groups: z
            .array(z.string())
            .optional()
            .describe('Filter by product group external IDs'),
          offerActive: z.boolean().optional().describe('Filter by offer active status')
        })
        .optional()
        .describe('Filter criteria'),
      page: z.number().optional().describe('Page number (default 1)'),
      limit: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      products: z.array(
        z.object({
          productId: z.number().optional(),
          article: z.string().optional(),
          name: z.string().optional(),
          url: z.string().optional(),
          imageUrl: z.string().optional(),
          description: z.string().optional(),
          active: z.boolean().optional(),
          quantity: z.number().optional(),
          groups: z
            .array(
              z.object({
                groupId: z.number().optional(),
                name: z.string().optional(),
                externalId: z.string().optional()
              })
            )
            .optional(),
          offers: z.array(offerSchema).optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let result = await client.getProducts(ctx.input.filter, ctx.input.page, ctx.input.limit);

    let products = result.products.map(p => ({
      productId: p.id,
      article: p.article,
      name: p.name,
      url: p.url,
      imageUrl: p.imageUrl,
      description: p.description,
      active: p.active,
      quantity: p.quantity,
      groups: p.groups?.map(g => ({
        groupId: g.id,
        name: g.name,
        externalId: g.externalId
      })),
      offers: p.offers?.map(o => ({
        offerId: o.id,
        externalId: o.externalId,
        name: o.name,
        article: o.article,
        barcode: o.barcode,
        price: o.price,
        purchasePrice: o.purchasePrice,
        quantity: o.quantity,
        weight: o.weight,
        images: o.images,
        unit: o.unit,
        properties: o.properties
      }))
    }));

    return {
      output: {
        products,
        totalCount: result.pagination.totalCount,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPageCount
      },
      message: `Found **${result.pagination.totalCount}** products (page ${result.pagination.currentPage} of ${result.pagination.totalPageCount}). Returned ${products.length} results.`
    };
  })
  .build();
