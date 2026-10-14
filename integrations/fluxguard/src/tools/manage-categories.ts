import { createApiServiceError, SlateTool } from 'slates';
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
  description: `List all site and page categories in your Fluxguard account, including their identifiers, names, and available category type.`,
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

    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw createApiServiceError('Fluxguard returned an invalid category list.');
    }

    let categories: Array<{ categoryId: string; name: string; type?: string }> = [];
    for (let [id, value] of Object.entries(result)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw createApiServiceError('Fluxguard returned invalid category data.');
      }
      let cat = value as Record<string, unknown>;
      categories.push({
        categoryId: id,
        name:
          typeof cat.name === 'string'
            ? cat.name
            : typeof cat.categoryName === 'string'
              ? cat.categoryName
              : id,
        type: typeof cat.type === 'string' ? cat.type : undefined
      });
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
    let categoryId = typeof result === 'string' ? result : (result?.categoryId ?? result?.id);
    if (typeof categoryId !== 'string' || !categoryId.trim()) {
      throw createApiServiceError(
        'Fluxguard did not return an identifier for the created category. Call list_categories before retrying.'
      );
    }

    return {
      output: {
        categoryId,
        name: ctx.input.name
      },
      message: `Created category **${ctx.input.name}**.`
    };
  })
  .build();
