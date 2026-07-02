import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

let subCategorySchema = z.object({
  categoryId: z.string().describe('Category ID (used in create/update mutations)'),
  name: z.string().nullable().describe('Category name')
});

let categorySchema = z.object({
  categoryId: z.string().describe('Category ID (used in create/update mutations)'),
  name: z.string().nullable().describe('Category name'),
  children: z.array(subCategorySchema).describe('Subcategories')
});

export let getCategories = SlateTool.create(spec, {
  name: 'Get Categories',
  key: 'get_categories',
  description: `List all available design categories on Cults3D with their subcategories. Category IDs are needed when creating or filtering designs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z
        .array(categorySchema)
        .describe('List of top-level categories with subcategories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let categories = await client.getCategories();

    let mapped = categories.map((c: any) => ({
      categoryId: c.id,
      name: c.name,
      children: (c.children ?? []).map((child: any) => ({
        categoryId: child.id,
        name: child.name
      }))
    }));

    return {
      output: {
        categories: mapped
      },
      message: `Found **${mapped.length}** top-level categories.`
    };
  })
  .build();
