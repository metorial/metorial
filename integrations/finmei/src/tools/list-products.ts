import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve a paginated list of products from the Finmei product catalog. Supports filtering by name and status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of products per page (default: 20, max: 100)'),
      name: z.string().optional().describe('Filter products by name (substring match)'),
      status: z.enum(['active', 'inactive']).optional().describe('Filter products by status')
    })
  )
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productId: z.string().describe('Product ID'),
            name: z.string().optional().describe('Product name'),
            price: z.number().optional().describe('Product price'),
            currency: z.string().optional().describe('Currency code'),
            description: z.string().optional().describe('Product description'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of products'),
      total: z.number().optional().describe('Total number of products'),
      page: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.listProducts({
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      name: ctx.input.name,
      status: ctx.input.status
    });

    let rawProducts = result?.data ?? result?.products ?? result ?? [];
    let productsArray = Array.isArray(rawProducts) ? rawProducts : [];

    let products = productsArray.map((p: any) => ({
      productId: String(p.id),
      name: p.name,
      price: p.price,
      currency: p.currency,
      description: p.description,
      createdAt: p.created_at
    }));

    let total = result?.total ?? result?.meta?.total;
    let page = result?.page ?? result?.meta?.current_page ?? ctx.input.page;
    let totalPages = result?.total_pages ?? result?.meta?.last_page;

    return {
      output: {
        products,
        total,
        page,
        totalPages
      },
      message: `Found **${products.length}** product(s)${total ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
