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
      hasMore: z.boolean().describe('Whether more categories are available'),
      nextOffset: z.number().optional().describe('Provider offset for the next category page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    let output = await client.listCategories(ctx.input);
    return { output, message: 'Retrieved product category page.' };
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
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    let output = await client.createCategory({
      categoryID: ctx.input.categoryId,
      title: ctx.input.title
    });
    return { output, message: 'Product category created.' };
  })
  .build();

export let deleteCategory = SlateTool.create(spec, {
  name: 'Delete Product Category',
  key: 'delete_category',
  description: `Delete a product category from the Omnisend catalog. Review product associations before deleting a category.`,
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
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    await client.deleteCategory(ctx.input.categoryId);
    return { output: { success: true }, message: 'Product category deletion completed.' };
  })
  .build();
