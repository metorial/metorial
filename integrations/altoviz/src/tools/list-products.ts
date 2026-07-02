import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let productSchema = z.object({
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
      pageIndex: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, default 10)'),
      productNumber: z.string().optional().describe('Search by product number')
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
      if (!Array.isArray(products)) {
        products = products ? [products] : [];
      }
    } else {
      products = await client.listProducts({
        pageIndex: ctx.input.pageIndex,
        pageSize: ctx.input.pageSize
      });
    }

    let mapped = products.map((p: any) => ({
      productId: p.id,
      name: p.name,
      number: p.number,
      description: p.description,
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      internalId: p.internalId
    }));

    return {
      output: { products: mapped },
      message: `Found **${mapped.length}** product(s).`
    };
  })
  .build();
