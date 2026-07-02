import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.number().describe('Category identifier'),
  name: z.string().describe('Category name'),
  sortOrder: z.number().describe('Display order'),
  createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
  updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
});

export let listCategories = SlateTool.create(spec, {
  name: 'List KPI Categories',
  key: 'list_categories',
  description: `Retrieve all KPI categories. Categories are used to organize KPIs into logical groups.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z.array(categorySchema).describe('List of all KPI categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let categories = await client.listKpiCategories();

    let mapped = categories.map((c: any) => ({
      categoryId: c.id,
      name: c.name,
      sortOrder: c.sort_order,
      createdAt: c.created_at ?? null,
      updatedAt: c.updated_at ?? null
    }));

    return {
      output: { categories: mapped },
      message: `Retrieved **${mapped.length}** KPI categories.`
    };
  })
  .build();

export let createCategory = SlateTool.create(spec, {
  name: 'Create KPI Category',
  key: 'create_category',
  description: `Create a new KPI category for organizing KPIs.`
})
  .input(
    z.object({
      name: z.string().describe('Category name (max 50 characters)'),
      sortOrder: z.number().describe('Display order')
    })
  )
  .output(
    z.object({
      categoryId: z.number().describe('ID of the newly created category'),
      name: z.string().describe('Name of the created category')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.createKpiCategory({
      name: ctx.input.name,
      sort_order: ctx.input.sortOrder
    });

    return {
      output: { categoryId: result.id, name: result.name },
      message: `Created category **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let updateCategory = SlateTool.create(spec, {
  name: 'Update KPI Category',
  key: 'update_category',
  description: `Update an existing KPI category's name or sort order.`
})
  .input(
    z.object({
      categoryId: z.number().describe('ID of the category to update'),
      name: z.string().optional().describe('New category name'),
      sortOrder: z.number().optional().describe('New display order')
    })
  )
  .output(
    z.object({
      categoryId: z.number().describe('ID of the updated category'),
      name: z.string().describe('Name of the updated category')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.sortOrder !== undefined) data.sort_order = ctx.input.sortOrder;

    let result = await client.updateKpiCategory(ctx.input.categoryId, data);

    return {
      output: { categoryId: result.id, name: result.name },
      message: `Updated category **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let deleteCategory = SlateTool.create(spec, {
  name: 'Delete KPI Category',
  key: 'delete_category',
  description: `Permanently delete a KPI category.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      categoryId: z.number().describe('ID of the category to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteKpiCategory(ctx.input.categoryId);

    return {
      output: { success: true },
      message: `Deleted category with ID **${ctx.input.categoryId}**.`
    };
  })
  .build();
