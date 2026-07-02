import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subcategorySchema = z.object({
  categoryId: z.number().describe('Subcategory ID'),
  name: z.string().describe('Subcategory name')
});

let categorySchema = z.object({
  categoryId: z.number().describe('Parent category ID'),
  name: z.string().describe('Parent category name'),
  subcategories: z
    .array(subcategorySchema)
    .describe('Subcategories within this parent category')
});

export let getCategories = SlateTool.create(spec, {
  name: 'Get Categories',
  key: 'get_categories',
  description: `Retrieve the hierarchical list of expense categories supported by Splitwise. Categories have parent categories and subcategories. When creating expenses, a subcategory ID must be used.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z.array(categorySchema).describe('Expense categories with subcategories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let categories = await client.getCategories();

    let mapped = (categories || []).map((cat: any) => ({
      categoryId: cat.id,
      name: cat.name,
      subcategories: (cat.subcategories || []).map((sub: any) => ({
        categoryId: sub.id,
        name: sub.name
      }))
    }));

    return {
      output: { categories: mapped },
      message: `Found **${mapped.length}** expense categories`
    };
  })
  .build();
