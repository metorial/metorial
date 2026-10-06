import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let categoryOutputSchema = z.object({
  categoryId: z.string().describe('Unique ID of the category'),
  name: z.string().optional().describe('Name of the category'),
  type: z.string().optional().describe('Category type (e.g., "views")')
});

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `List all categories of a given type. Categories allow logical grouping of views.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      type: z.string().describe('Category type to list (e.g., "views")')
    })
  )
  .output(
    z.object({
      categories: z.array(categoryOutputSchema).describe('List of categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serviceKey: ctx.auth.token,
      authType: ctx.auth.authType,
      apiEndpoint: ctx.auth.apiEndpoint
    });
    let categories = await client.listCategories(ctx.input.type);
    let catList = categories;

    return {
      output: {
        categories: catList.map(c => ({
          categoryId: c.id,
          name: c.name,
          type: c.type || ctx.input.type
        }))
      },
      message: `Found **${catList.length}** category(ies) of type **${ctx.input.type}**.`
    };
  })
  .build();

export let getCategory = SlateTool.create(spec, {
  name: 'Get Category',
  key: 'get_category',
  description:
    'Read a view, board, or screen category by ID. Call list_categories for that type to discover available IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      type: z.string().describe('Category type: views, boards, or screens'),
      categoryId: z
        .string()
        .describe('Category ID. Call list_categories with the same type to discover IDs.')
    })
  )
  .output(categoryOutputSchema)
  .handleInvocation(async ctx => {
    const client = new Client({
      serviceKey: ctx.auth.token,
      authType: ctx.auth.authType,
      apiEndpoint: ctx.auth.apiEndpoint
    });
    const category = await client.getCategory(ctx.input.type, ctx.input.categoryId);
    return {
      output: {
        categoryId: category.id,
        name: category.name,
        type: category.type ?? ctx.input.type
      },
      message: `Retrieved category **${category.name ?? category.id}**.`
    };
  })
  .build();

export let createCategory = SlateTool.create(spec, {
  name: 'Create Category',
  key: 'create_category',
  description: `Create a new category for organizing views. Specify a type (e.g., "views") and a name.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      type: z.string().describe('Category type (e.g., "views")'),
      name: z.string().describe('Name for the new category')
    })
  )
  .output(categoryOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      serviceKey: ctx.auth.token,
      authType: ctx.auth.authType,
      apiEndpoint: ctx.auth.apiEndpoint
    });
    let c = await client.createCategory(ctx.input.type, { name: ctx.input.name });

    return {
      output: {
        categoryId: c.id,
        name: c.name || ctx.input.name,
        type: c.type || ctx.input.type
      },
      message: `Created category **${c.name || ctx.input.name}**.`
    };
  })
  .build();

export let updateCategory = SlateTool.create(spec, {
  name: 'Update Category',
  key: 'update_category',
  description: `Update a category's name.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      type: z.string().describe('Category type (e.g., "views")'),
      categoryId: z.string().describe('ID of the category to update'),
      name: z.string().describe('New name for the category')
    })
  )
  .output(categoryOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      serviceKey: ctx.auth.token,
      authType: ctx.auth.authType,
      apiEndpoint: ctx.auth.apiEndpoint
    });
    let c = await client.updateCategory(ctx.input.type, ctx.input.categoryId, {
      name: ctx.input.name
    });

    return {
      output: {
        categoryId: c.id,
        name: c.name || ctx.input.name,
        type: c.type || ctx.input.type
      },
      message: `Updated category **${c.name || ctx.input.categoryId}**.`
    };
  })
  .build();

export let deleteCategory = SlateTool.create(spec, {
  name: 'Delete Category',
  key: 'delete_category',
  description: `Delete a category by its type and ID.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      type: z.string().describe('Category type (e.g., "views")'),
      categoryId: z.string().describe('ID of the category to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the category was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serviceKey: ctx.auth.token,
      authType: ctx.auth.authType,
      apiEndpoint: ctx.auth.apiEndpoint
    });
    await client.deleteCategory(ctx.input.type, ctx.input.categoryId);

    return {
      output: { deleted: true },
      message: `Deleted category **${ctx.input.categoryId}**.`
    };
  })
  .build();
