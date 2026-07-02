import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List products (such as event tickets) available in a campaign. Returns product details including pricing and availability.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignUuid: z.string().describe('UUID of the campaign'),
      limit: z.number().optional().describe('Maximum number of products to return'),
      offset: z.number().optional().describe('Number of products to skip for pagination')
    })
  )
  .output(
    z.object({
      products: z.array(z.record(z.string(), z.any())).describe('List of product objects'),
      pagination: z
        .object({
          total: z.number().optional(),
          offset: z.number().optional(),
          limit: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });

    let result = await client.listProducts(ctx.input.campaignUuid, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let products = result.data || [];
    let pagination = result.pagination;

    return {
      output: { products, pagination },
      message: `Found **${products.length}** product(s).`
    };
  })
  .build();
