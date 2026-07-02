import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve the list of all supported Zap categories on the Zapier platform. Categories organize apps by function (e.g., "Accounting", "AI Tools", "Analytics").
Use category slugs to filter apps in the **List Apps** tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of categories to return (default: 10)'),
      offset: z.number().optional().describe('Number of categories to skip')
    })
  )
  .output(
    z.object({
      categories: z.array(
        z.object({
          categoryId: z.number().describe('Unique category identifier'),
          title: z.string().describe('Category name'),
          slug: z.string().describe('URL-friendly identifier, usable for filtering apps'),
          description: z.string().describe('Category description'),
          url: z.string().describe('Category webpage URL'),
          typeOf: z.string().describe('Category type: curated or auto'),
          role: z.string().describe('Category role: parent or child')
        })
      ),
      totalCount: z.number().describe('Total number of categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getCategories({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let categories = (response.objects || []).map(cat => ({
      categoryId: cat.id,
      title: cat.title,
      slug: cat.slug,
      description: cat.description,
      url: cat.url,
      typeOf: cat.typeOf,
      role: cat.role
    }));

    return {
      output: {
        categories,
        totalCount: response.count
      },
      message: `Retrieved **${categories.length}** of ${response.count} total categories.`
    };
  })
  .build();
