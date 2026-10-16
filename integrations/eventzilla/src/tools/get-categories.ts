import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireText } from '../lib/responses';
import { spec } from '../spec';

export let getCategoriesTool = SlateTool.create(spec, {
  name: 'Get Categories',
  key: 'get_categories',
  description: `Retrieve the list of available event categories (e.g., Business, Music, Conferences, Training) used for organizing and filtering events.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete response returned by Eventzilla'),
      categories: z.array(z.string()).describe('List of available event category names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getCategories();

    let rawCategories = Array.isArray(data?.categories)
      ? data.categories
      : Array.isArray(data)
        ? data
        : undefined;
    if (!rawCategories)
      throw createApiServiceError('Eventzilla returned an invalid categories response.');
    let categories = rawCategories.map((c: any) =>
      requireText(typeof c === 'string' ? c : c?.category, 'category name')
    );

    return {
      output: { categories, raw: data },
      message: `Found **${categories.length}** event categories.`
    };
  })
  .build();
