import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List all products (workspaces) in your Aha! account. Returns product names, reference prefixes, and basic configuration. Use this to discover available products before working with features, releases, or other records scoped to a product.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (1-indexed)'),
      perPage: z.number().optional().describe('Records per page (max 200)')
    })
  )
  .output(
    z.object({
      products: z.array(
        z.object({
          productId: z.string().describe('Product ID'),
          referencePrefix: z.string().describe('Reference prefix used for record numbering'),
          name: z.string().describe('Product name'),
          description: z.string().optional().describe('Product description'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      ),
      totalRecords: z.number().describe('Total number of products'),
      totalPages: z.number().describe('Total number of pages'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);

    let result = await client.listProducts({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let products = result.products.map(p => ({
      productId: p.id,
      referencePrefix: p.reference_prefix,
      name: p.name,
      description: p.description,
      createdAt: p.created_at
    }));

    return {
      output: {
        products,
        totalRecords: result.pagination.total_records,
        totalPages: result.pagination.total_pages,
        currentPage: result.pagination.current_page
      },
      message: `Found **${result.pagination.total_records}** products (page ${result.pagination.current_page}/${result.pagination.total_pages}).`
    };
  })
  .build();
