import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let productSchema = z.object({
  raw: z.record(z.string(), z.unknown()).optional(),
  productId: z.number().describe('Altoviz product ID'),
  name: z.string().nullable().optional(),
  number: z.string().nullable().optional().describe('Product number'),
  description: z.string().nullable().optional(),
  purchasePrice: z.number().nullable().optional(),
  salePrice: z.number().nullable().optional(),
  internalId: z.string().nullable().optional()
});

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List products from your Altoviz account. You can also search for a product by its product number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text search query'),
      orderBy: z
        .string()
        .optional()
        .describe('Provider ordering expression, for example name desc'),
      pageIndex: z.number().optional().describe('Page index (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page'),
      productNumber: z
        .string()
        .optional()
        .describe(
          'Search by exact product number; pagination and full-text search do not apply'
        ),
      familyId: z.string().optional().describe('Filter by product family ID')
    })
  )
  .output(
    z.object({
      products: z.array(productSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let products: any[];
    if (ctx.input.productNumber) {
      products = await client.findProduct(ctx.input.productNumber);
    } else {
      products = await client.listProducts({
        query: ctx.input.query,
        orderBy: ctx.input.orderBy,
        pageIndex: ctx.input.pageIndex,
        familyId: ctx.input.familyId,
        pageSize: ctx.input.pageSize
      });
    }

    let mapped = products.map((p: any) => ({
      raw: p,
      productId: p.id,
      name: p.name,
      number: p.number,
      description: p.description,
      purchasePrice: p.purchasePrice,
      salePrice: p.taxExcludedPrice ?? p.unitPrice ?? p.salePrice,
      internalId: p.internalId
    }));

    return {
      output: { products: mapped },
      message: `Found **${mapped.length}** product(s).`
    };
  })
  .build();
