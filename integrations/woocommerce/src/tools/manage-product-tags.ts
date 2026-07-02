import { SlateTool } from 'slates';
import { z } from 'zod';
import { woocommerceServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let productTagSchema = z.object({
  tagId: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  count: z.number()
});

export let manageProductTags = SlateTool.create(spec, {
  name: 'Manage Product Tags',
  key: 'manage_product_tags',
  description: `List, get, create, update, or delete product tags used to organize and filter products in WooCommerce.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      tagId: z.number().optional().describe('Product tag ID (required for get/update/delete)'),
      page: z.number().optional().default(1).describe('Page number for list'),
      perPage: z.number().optional().default(10).describe('Results per page for list'),
      search: z.string().optional().describe('Search term for list'),
      slug: z.string().optional().describe('Tag slug, or slug filter for list'),
      product: z
        .number()
        .optional()
        .describe('Limit list results to tags assigned to product ID'),
      hideEmpty: z
        .boolean()
        .optional()
        .describe('Whether to hide tags not assigned to products'),
      orderby: z
        .enum(['id', 'include', 'name', 'slug', 'term_group', 'description', 'count'])
        .optional()
        .describe('Sort list results by field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      name: z.string().optional().describe('Tag name (required for create)'),
      description: z.string().optional().describe('Tag description'),
      force: z
        .boolean()
        .optional()
        .default(true)
        .describe('Force deletion; product tags do not support trashing')
    })
  )
  .output(
    z.object({
      tags: z.array(productTagSchema).optional(),
      tag: productTagSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {
        page: ctx.input.page,
        per_page: ctx.input.perPage
      };
      if (ctx.input.search) params.search = ctx.input.search;
      if (ctx.input.slug) params.slug = ctx.input.slug;
      if (ctx.input.product !== undefined) params.product = ctx.input.product;
      if (ctx.input.hideEmpty !== undefined) params.hide_empty = ctx.input.hideEmpty;
      if (ctx.input.orderby) params.orderby = ctx.input.orderby;
      if (ctx.input.order) params.order = ctx.input.order;

      let tags = await client.listProductTags(params);
      let mapped = (Array.isArray(tags) ? tags : []).map((tag: any) => mapProductTag(tag));
      return {
        output: { tags: mapped },
        message: `Found **${mapped.length}** product tags.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.tagId) throw woocommerceServiceError('tagId is required for get action');
      let tag = await client.getProductTag(ctx.input.tagId);
      return {
        output: { tag: mapProductTag(tag) },
        message: `Retrieved product tag **"${tag.name}"** (ID: ${tag.id}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw woocommerceServiceError('name is required for create action');
      let data = buildProductTagData(ctx.input);
      data.name = ctx.input.name;

      let tag = await client.createProductTag(data);
      return {
        output: { tag: mapProductTag(tag) },
        message: `Created product tag **"${tag.name}"** (ID: ${tag.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.tagId)
        throw woocommerceServiceError('tagId is required for update action');
      let tag = await client.updateProductTag(ctx.input.tagId, buildProductTagData(ctx.input));
      return {
        output: { tag: mapProductTag(tag) },
        message: `Updated product tag **"${tag.name}"** (ID: ${tag.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.tagId)
        throw woocommerceServiceError('tagId is required for delete action');
      await client.deleteProductTag(ctx.input.tagId, ctx.input.force);
      return {
        output: { deleted: true },
        message: `Deleted product tag (ID: ${ctx.input.tagId}).`
      };
    }

    throw woocommerceServiceError(`Unknown action: ${action}`);
  })
  .build();

let buildProductTagData = (input: any) => {
  let data: Record<string, any> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.description !== undefined) data.description = input.description;
  return data;
};

let mapProductTag = (tag: any) => ({
  tagId: tag.id,
  name: tag.name || '',
  slug: tag.slug || '',
  description: tag.description || '',
  count: tag.count || 0
});
