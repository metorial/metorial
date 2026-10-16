import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { pickWritable, requireForCreate } from '../lib/upsert';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.string().describe('Category ID'),
  categoryName: z.string().describe('Category name'),
  color: z.string().nullable().optional().describe('Display color'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

let mapCategory = (c: any) => ({
  categoryId: c.id,
  categoryName: c.name,
  color: c.color,
  createdAt: c.created_at,
  updatedAt: c.updated_at,
  deletedAt: c.deleted_at
});

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve item categories. Categories are used to organize items in the catalog.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      categoryIds: z
        .array(z.string())
        .optional()
        .describe('Only return categories with these IDs'),
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of categories to return (1-250, default 50)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      showDeleted: z.boolean().optional().describe('Include deleted categories')
    })
  )
  .output(
    z.object({
      categories: z.array(categorySchema),
      cursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCategories({
      categoryIds: joinIds(ctx.input.categoryIds),
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      showDeleted: ctx.input.showDeleted
    });

    let categories = (result.categories ?? []).map(mapCategory);

    return {
      output: { categories, cursor: result.cursor },
      message: `Retrieved **${categories.length}** category(ies).${result.cursor ? ' More available via cursor.' : ''}`
    };
  })
  .build();

export let createOrUpdateCategory = SlateTool.create(spec, {
  name: 'Create or Update Category',
  key: 'create_or_update_category',
  description: `Create a new category or update an existing one. Categories organize items in the Loyverse catalog. When updating, fields you omit keep their current values.`
})
  .input(
    z.object({
      categoryId: z.string().optional().describe('Category ID to update; omit to create'),
      categoryName: z
        .string()
        .optional()
        .describe('Category name (required when creating, max 64 characters)'),
      color: z
        .string()
        .nullable()
        .optional()
        .describe('Display color: GREY, RED, PINK, ORANGE, GREEN, BLUE, or PURPLE')
    })
  )
  .output(categorySchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let isUpdate = !!ctx.input.categoryId;

    let body: any = {};
    if (isUpdate) {
      let existing = await client.getCategory(ctx.input.categoryId!);
      body = pickWritable(existing, ['name', 'color']);
      body.id = ctx.input.categoryId;
    } else {
      requireForCreate(ctx.input.categoryName, 'categoryName', 'category');
    }
    if (ctx.input.categoryName !== undefined) body.name = ctx.input.categoryName;
    if (ctx.input.color !== undefined) body.color = ctx.input.color?.toUpperCase() ?? null;

    let result = await client.createOrUpdateCategory(body);

    return {
      output: mapCategory(result),
      message: `${isUpdate ? 'Updated' : 'Created'} category **${result.name}**.`
    };
  })
  .build();

export let deleteCategory = SlateTool.create(spec, {
  name: 'Delete Category',
  key: 'delete_category',
  description: `Delete a category by its ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      categoryId: z.string().describe('ID of the category to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteCategory(ctx.input.categoryId);

    return {
      output: { deleted: true },
      message: `Deleted category \`${ctx.input.categoryId}\`.`
    };
  })
  .build();
