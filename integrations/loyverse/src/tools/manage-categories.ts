import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.string().describe('Category ID'),
  categoryName: z.string().describe('Category name'),
  color: z.string().nullable().optional().describe('Display color'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve all item categories. Categories are used to organize items in the catalog.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().min(1).max(250).optional().describe('Number of categories to return'),
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
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      showDeleted: ctx.input.showDeleted
    });

    let categories = (result.categories ?? []).map((c: any) => ({
      categoryId: c.id,
      categoryName: c.name,
      color: c.color,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      deletedAt: c.deleted_at
    }));

    return {
      output: { categories, cursor: result.cursor },
      message: `Retrieved **${categories.length}** category(ies).`
    };
  })
  .build();

export let createOrUpdateCategory = SlateTool.create(spec, {
  name: 'Create or Update Category',
  key: 'create_or_update_category',
  description: `Create a new category or update an existing one. Categories organize items in the Loyverse catalog.`
})
  .input(
    z.object({
      categoryId: z.string().optional().describe('Category ID to update; omit to create'),
      categoryName: z.string().optional().describe('Category name'),
      color: z
        .string()
        .nullable()
        .optional()
        .describe('Display color (hex or predefined name)')
    })
  )
  .output(categorySchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: any = {};
    if (ctx.input.categoryId) body.id = ctx.input.categoryId;
    if (ctx.input.categoryName !== undefined) body.name = ctx.input.categoryName;
    if (ctx.input.color !== undefined) body.color = ctx.input.color;

    let result = await client.createOrUpdateCategory(body);
    let isUpdate = !!ctx.input.categoryId;

    return {
      output: {
        categoryId: result.id,
        categoryName: result.name,
        color: result.color,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        deletedAt: result.deleted_at
      },
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
