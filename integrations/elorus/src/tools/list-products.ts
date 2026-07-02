import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Search and list products and services (inventory items) in your Elorus organization. Products can be referenced on invoice and bill line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Free-text search across product name and code.'),
      ordering: z.string().optional().describe('Sort field. Prefix with "-" for descending.'),
      page: z.number().optional().describe('Page number (starts at 1).'),
      pageSize: z.number().optional().describe('Results per page (max 250).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching products.'),
      products: z.array(z.any()).describe('Array of product objects.'),
      hasMore: z.boolean().describe('Whether there are more pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listProducts({
      search: ctx.input.search,
      ordering: ctx.input.ordering,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        products: result.results,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** product(s). Returned ${result.results.length} on this page.`
    };
  })
  .build();
