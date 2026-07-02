import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.number(),
  name: z.string(),
  slug: z.string(),
  parentId: z.number(),
  description: z.string(),
  count: z.number()
});

export let manageProductCategories = SlateTool.create(spec, {
  name: 'Manage Product Categories',
  key: 'manage_product_categories',
  description: `List, create, update, or delete product categories. Categories help organize products and can be nested hierarchically.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      categoryId: z.number().optional().describe('Category ID (required for update/delete)'),
      name: z.string().optional().describe('Category name (required for create)'),
      slug: z.string().optional().describe('Category slug'),
      parentId: z.number().optional().describe('Parent category ID for nesting'),
      description: z.string().optional().describe('Category description'),
      image: z
        .object({
          src: z.string().describe('Image URL'),
          name: z.string().optional(),
          alt: z.string().optional()
        })
        .optional()
        .describe('Category image'),
      page: z.number().optional().default(1).describe('Page number for list'),
      perPage: z.number().optional().default(100).describe('Results per page for list'),
      search: z.string().optional().describe('Search term for list'),
      force: z
        .boolean()
        .optional()
        .default(true)
        .describe('Force deletion (categories require force=true)')
    })
  )
  .output(
    z.object({
      categories: z.array(categorySchema).optional(),
      category: categorySchema.optional(),
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

      let categories = await client.listProductCategories(params);
      let mapped = categories.map((c: any) => mapCategory(c));

      return {
        output: { categories: mapped },
        message: `Found **${mapped.length}** product categories.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');

      let data: Record<string, any> = { name: ctx.input.name };
      if (ctx.input.slug) data.slug = ctx.input.slug;
      if (ctx.input.parentId !== undefined) data.parent = ctx.input.parentId;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.image) data.image = ctx.input.image;

      let category = await client.createProductCategory(data);

      return {
        output: { category: mapCategory(category) },
        message: `Created category **"${category.name}"** (ID: ${category.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.categoryId) throw new Error('categoryId is required for update action');

      let data: Record<string, any> = {};
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.slug) data.slug = ctx.input.slug;
      if (ctx.input.parentId !== undefined) data.parent = ctx.input.parentId;
      if (ctx.input.description !== undefined) data.description = ctx.input.description;
      if (ctx.input.image) data.image = ctx.input.image;

      let category = await client.updateProductCategory(ctx.input.categoryId, data);

      return {
        output: { category: mapCategory(category) },
        message: `Updated category **"${category.name}"** (ID: ${category.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.categoryId) throw new Error('categoryId is required for delete action');

      await client.deleteProductCategory(ctx.input.categoryId, ctx.input.force);

      return {
        output: { deleted: true },
        message: `Deleted category (ID: ${ctx.input.categoryId}).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapCategory = (c: any) => ({
  categoryId: c.id,
  name: c.name,
  slug: c.slug,
  parentId: c.parent || 0,
  description: c.description || '',
  count: c.count || 0
});
