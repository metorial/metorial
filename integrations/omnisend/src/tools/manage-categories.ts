import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.string().describe('Category ID'),
  title: z.string().optional().describe('Category title'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

export let listCategories = SlateTool.create(spec, {
  name: 'List Product Categories',
  key: 'list_categories',
  description: `List product categories from the Omnisend catalog. Categories are used to organize products and enable category-based automations and product recommendations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().min(1).max(250).optional().describe('Number of categories to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      categories: z.array(categorySchema).describe('List of product categories'),
      hasMore: z.boolean().describe('Whether more categories are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);

    let result = await client.listCategories({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let categories = (result.categories || []).map((c: any) => ({
      categoryId: c.id || c.categoryID,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: {
        categories,
        hasMore: !!result.paging?.next
      },
      message: `Retrieved **${categories.length}** categories.`
    };
  })
  .build();

export let createCategory = SlateTool.create(spec, {
  name: 'Create Product Category',
  key: 'create_category',
  description: `Create a new product category in the Omnisend catalog. Categories help organize products and power category-based segments and automations.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      categoryId: z.string().describe('Unique category identifier'),
      title: z.string().describe('Category title')
    })
  )
  .output(categorySchema)
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);

    let result = await client.createCategory({
      id: ctx.input.categoryId,
      title: ctx.input.title
    });

    return {
      output: {
        categoryId: result.id || ctx.input.categoryId,
        title: ctx.input.title,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Created category **${ctx.input.title}** (ID: ${ctx.input.categoryId}).`
    };
  })
  .build();

export let deleteCategory = SlateTool.create(spec, {
  name: 'Delete Product Category',
  key: 'delete_category',
  description: `Delete a product category from the Omnisend catalog. This removes the category but does not affect products assigned to it.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      categoryId: z.string().describe('Category ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);
    await client.deleteCategory(ctx.input.categoryId);

    return {
      output: { success: true },
      message: `Deleted category (ID: ${ctx.input.categoryId}).`
    };
  })
  .build();
