import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVariants = SlateTool.create(spec, {
  name: 'List Variants',
  key: 'list_variants',
  description:
    'List product variants with their stable IDs, stock quantities, SKU, barcode, and prices in minor currency units. Use the returned IDs with update_inventory.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      productId: z
        .string()
        .optional()
        .describe('Product ID from list_products; filters variants using item_id'),
      sku: z.string().optional().describe('Filter variants by SKU'),
      barcode: z.string().optional().describe('Filter variants by barcode'),
      pageNumber: z.number().optional().describe('Page number, a positive integer'),
      pageSize: z
        .number()
        .optional()
        .describe('Items per page, an integer from 1 to 100; default 20'),
      sort: z
        .string()
        .optional()
        .describe('Attribute to sort by; prefix with - for descending')
    })
  )
  .output(
    z.object({
      variants: z.array(z.any()),
      totalCount: z.number(),
      currentPage: z.number(),
      lastPage: z.number(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });
    let res = await client.listVariants({
      filters: {
        ...(ctx.input.productId !== undefined ? { item_id: ctx.input.productId } : {}),
        ...(ctx.input.sku !== undefined ? { sku: ctx.input.sku } : {}),
        ...(ctx.input.barcode !== undefined ? { barcode: ctx.input.barcode } : {})
      },
      pagination: { pageNumber: ctx.input.pageNumber, pageSize: ctx.input.pageSize },
      sort: ctx.input.sort
    });
    return {
      output: {
        variants: res.data,
        totalCount: res.meta.page.total,
        currentPage: res.meta.page['current-page'],
        lastPage: res.meta.page['last-page'],
        raw: res
      },
      message: `Retrieved ${res.data.length} variants (page ${res.meta.page['current-page']} of ${res.meta.page['last-page']}).`
    };
  })
  .build();
