import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Search and list products from the CloudCart store. Supports filtering by SKU, barcode, category, or vendor. Results are paginated and can be sorted by any product attribute.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number to retrieve (1-based)'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of products per page (max 100)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, prefix with - for descending (e.g. "-date_added", "name")'),
      sku: z.string().optional().describe('Filter by SKU'),
      barcode: z.string().optional().describe('Filter by barcode'),
      categoryId: z.string().optional().describe('Filter by category ID'),
      vendorId: z.string().optional().describe('Filter by vendor ID')
    })
  )
  .output(
    z.object({
      products: z.array(
        z.object({
          productId: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          priceFrom: z.any().optional(),
          priceTo: z.any().optional(),
          active: z.any().optional(),
          draft: z.any().optional(),
          urlHandle: z.string().optional(),
          dateAdded: z.string().optional(),
          dateModified: z.string().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      lastPage: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let filters: Record<string, string> = {};
    if (ctx.input.sku) filters.sku = ctx.input.sku;
    if (ctx.input.barcode) filters.barcode = ctx.input.barcode;
    if (ctx.input.categoryId) filters.category_id = ctx.input.categoryId;
    if (ctx.input.vendorId) filters.vendor_id = ctx.input.vendorId;

    let res = await client.listProducts({
      pagination: { pageNumber: ctx.input.pageNumber, pageSize: ctx.input.pageSize },
      sort: ctx.input.sort,
      filters: Object.keys(filters).length > 0 ? filters : undefined
    });

    let products = res.data.map(p => ({
      productId: p.id,
      name: p.attributes.name,
      description: p.attributes.description,
      priceFrom: p.attributes.price_from,
      priceTo: p.attributes.price_to,
      active: p.attributes.active,
      draft: p.attributes.draft,
      urlHandle: p.attributes.url_handle,
      dateAdded: p.attributes.date_added,
      dateModified: p.attributes.date_modified
    }));

    return {
      output: {
        products,
        totalCount: res.meta.total,
        currentPage: res.meta['current-page'],
        lastPage: res.meta['last-page']
      },
      message: `Found **${res.meta.total}** products (page ${res.meta['current-page']} of ${res.meta['last-page']}).`
    };
  })
  .build();
