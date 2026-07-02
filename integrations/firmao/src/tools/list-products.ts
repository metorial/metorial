import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Search and list products and services from Firmao. Supports filtering by name, product code, and pagination. Returns pricing, stock levels, and classification details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum results to return'),
      sort: z.string().optional().describe('Field to sort by'),
      dir: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter products whose name contains this value'),
      productCode: z.string().optional().describe('Filter by exact product code')
    })
  )
  .output(
    z.object({
      products: z.array(
        z.object({
          productId: z.number(),
          name: z.string(),
          productCode: z.string().optional(),
          saleable: z.boolean().optional(),
          purchaseNetPrice: z.number().optional(),
          purchaseGrossPrice: z.number().optional(),
          saleNetPrice: z.number().optional(),
          saleGrossPrice: z.number().optional(),
          currentStoreState: z.number().optional(),
          unit: z.string().optional(),
          creationDate: z.string().optional()
        })
      ),
      totalSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let filters: Record<string, string> = {};
    if (ctx.input.nameContains) filters['name(contains)'] = ctx.input.nameContains;
    if (ctx.input.productCode) filters['productCode(eq)'] = ctx.input.productCode;

    let result = await client.list('products', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let products = result.data.map((p: any) => ({
      productId: p.id,
      name: p.name,
      productCode: p.productCode,
      saleable: p.saleable,
      purchaseNetPrice: p.purchasePriceGroup?.netPrice,
      purchaseGrossPrice: p.purchasePriceGroup?.grossPrice,
      saleNetPrice: p.salePriceGroup?.netPrice,
      saleGrossPrice: p.salePriceGroup?.grossPrice,
      currentStoreState: p.currentStoreState,
      unit: p.unit,
      creationDate: p.creationDate
    }));

    return {
      output: { products, totalSize: result.totalSize },
      message: `Found **${products.length}** product(s) (total: ${result.totalSize}).`
    };
  })
  .build();
