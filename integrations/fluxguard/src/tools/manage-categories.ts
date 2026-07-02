import { SlateTool } from 'slates';
import { z } from 'zod';
import { FluxguardClient } from '../lib/client';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.string().describe('ID of the category'),
  name: z.string().describe('Name of the category'),
  type: z.string().optional().describe('Whether this is a site or page category')
});

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `List all site categories in your Fluxguard account. Categories are used to organize monitored sites into logical groups.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z.array(categorySchema).describe('All categories in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    let result = await client.listCategories();

    let categories: Array<{ categoryId: string; name: string; type?: string }> = [];
    if (result && typeof result === 'object') {
      for (let [id, value] of Object.entries(result)) {
        let cat = value as any;
        categories.push({
          categoryId: id,
          name: cat.name ?? cat.categoryName ?? id,
          type: cat.type ?? undefined
        });
      }
    }

    return {
      output: { categories },
      message: `Found **${categories.length}** categories.`
    };
  })
  .build();

export let createCategory = SlateTool.create(spec, {
  name: 'Create Category',
  key: 'create_category',
  description: `Create a new site category in your Fluxguard account. Categories help organize your monitored sites into logical groups.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new category')
    })
  )
  .output(
    z.object({
      categoryId: z.string().describe('ID of the newly created category'),
      name: z.string().describe('Name of the created category')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    let result = await client.createCategory(ctx.input.name);

    return {
      output: {
        categoryId: result.categoryId ?? result.id ?? '',
        name: ctx.input.name
      },
      message: `Created category **${ctx.input.name}**.`
    };
  })
  .build();
