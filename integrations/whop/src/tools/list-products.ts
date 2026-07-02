import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

let productSchema = z.object({
  productId: z.string().describe('Unique product identifier'),
  title: z.string().describe('Product title'),
  visibility: z.string().nullable().describe('Product visibility status'),
  headline: z.string().nullable().describe('Short product headline'),
  description: z.string().nullable().describe('Product description'),
  route: z.string().nullable().describe('URL-friendly product route slug'),
  memberCount: z.number().describe('Number of members for this product'),
  createdAt: z.string().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().describe('ISO 8601 last update timestamp')
});

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List products in your Whop company. Products represent what customers purchase access to. Supports filtering by visibility and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company ID. Uses config companyId if not provided.'),
      visibilities: z
        .array(z.enum(['visible', 'hidden', 'archived', 'quick_link']))
        .optional()
        .describe('Filter by visibility status'),
      order: z
        .enum(['active_memberships_count', 'created_at', 'usd_gmv', 'usd_gmv_30_days'])
        .optional()
        .describe('Sort order field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      cursor: z.string().optional().describe('Pagination cursor for fetching the next page'),
      limit: z.number().optional().describe('Number of results to return (max 100)')
    })
  )
  .output(
    z.object({
      products: z.array(productSchema),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let companyId = ctx.input.companyId || ctx.config.companyId;
    if (!companyId) {
      throw new Error(
        'companyId is required. Provide it in the input or configure it globally.'
      );
    }

    let client = new WhopClient(ctx.auth.token);
    let result = await client.listProducts({
      companyId,
      visibilities: ctx.input.visibilities,
      order: ctx.input.order,
      direction: ctx.input.direction,
      after: ctx.input.cursor,
      first: ctx.input.limit
    });

    let products = (result.data || []).map((p: any) => ({
      productId: p.id,
      title: p.title,
      visibility: p.visibility,
      headline: p.headline || null,
      description: p.description || null,
      route: p.route || null,
      memberCount: p.member_count || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    return {
      output: {
        products,
        hasNextPage: result.page_info?.has_next_page || false,
        endCursor: result.page_info?.end_cursor || null
      },
      message: `Found **${products.length}** products.${result.page_info?.has_next_page ? ' More results available.' : ''}`
    };
  })
  .build();
