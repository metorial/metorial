import { SlateTool } from 'slates';
import { z } from 'zod';
import { woocommerceServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let shippingClassSchema = z.object({
  shippingClassId: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  count: z.number()
});

export let manageShippingClasses = SlateTool.create(spec, {
  name: 'Manage Shipping Classes',
  key: 'manage_shipping_classes',
  description: `List, get, create, update, or delete product shipping classes used to group products with similar shipping costs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      shippingClassId: z
        .number()
        .optional()
        .describe('Shipping class ID (required for get/update/delete)'),
      page: z.number().optional().default(1).describe('Page number for list'),
      perPage: z.number().optional().default(10).describe('Results per page for list'),
      search: z.string().optional().describe('Search term for list'),
      slug: z.string().optional().describe('Shipping class slug, or slug filter for list'),
      product: z
        .number()
        .optional()
        .describe('Limit list results to classes assigned to product ID'),
      hideEmpty: z
        .boolean()
        .optional()
        .describe('Whether to hide classes not assigned to products'),
      orderby: z
        .enum(['id', 'include', 'name', 'slug', 'term_group', 'description', 'count'])
        .optional()
        .describe('Sort list results by field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      name: z.string().optional().describe('Shipping class name (required for create)'),
      description: z.string().optional().describe('Shipping class description'),
      force: z
        .boolean()
        .optional()
        .default(true)
        .describe('Force deletion; shipping classes do not support trashing')
    })
  )
  .output(
    z.object({
      shippingClasses: z.array(shippingClassSchema).optional(),
      shippingClass: shippingClassSchema.optional(),
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

      let classes = await client.listShippingClasses(params);
      let mapped = (Array.isArray(classes) ? classes : []).map((item: any) =>
        mapShippingClass(item)
      );
      return {
        output: { shippingClasses: mapped },
        message: `Found **${mapped.length}** shipping classes.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.shippingClassId)
        throw woocommerceServiceError('shippingClassId is required for get action');
      let shippingClass = await client.getShippingClass(ctx.input.shippingClassId);
      return {
        output: { shippingClass: mapShippingClass(shippingClass) },
        message: `Retrieved shipping class **"${shippingClass.name}"** (ID: ${shippingClass.id}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw woocommerceServiceError('name is required for create action');
      let data = buildShippingClassData(ctx.input);
      data.name = ctx.input.name;
      let shippingClass = await client.createShippingClass(data);
      return {
        output: { shippingClass: mapShippingClass(shippingClass) },
        message: `Created shipping class **"${shippingClass.name}"** (ID: ${shippingClass.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.shippingClassId)
        throw woocommerceServiceError('shippingClassId is required for update action');
      let shippingClass = await client.updateShippingClass(
        ctx.input.shippingClassId,
        buildShippingClassData(ctx.input)
      );
      return {
        output: { shippingClass: mapShippingClass(shippingClass) },
        message: `Updated shipping class **"${shippingClass.name}"** (ID: ${shippingClass.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.shippingClassId)
        throw woocommerceServiceError('shippingClassId is required for delete action');
      await client.deleteShippingClass(ctx.input.shippingClassId, ctx.input.force);
      return {
        output: { deleted: true },
        message: `Deleted shipping class (ID: ${ctx.input.shippingClassId}).`
      };
    }

    throw woocommerceServiceError(`Unknown action: ${action}`);
  })
  .build();

let buildShippingClassData = (input: any) => {
  let data: Record<string, any> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.description !== undefined) data.description = input.description;
  return data;
};

let mapShippingClass = (shippingClass: any) => ({
  shippingClassId: shippingClass.id,
  name: shippingClass.name || '',
  slug: shippingClass.slug || '',
  description: shippingClass.description || '',
  count: shippingClass.count || 0
});
