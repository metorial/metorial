import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCategoriesAndTags = SlateTool.create(spec, {
  name: 'List Categories and Tags',
  key: 'list_categories_and_tags',
  description: `Retrieve all categories and tags currently used by your Carbone templates. Useful for discovering available template groupings and labels before filtering or uploading templates.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z
        .array(
          z.object({
            name: z.string().describe('Category name.')
          })
        )
        .describe('List of categories used by templates.'),
      tags: z
        .array(
          z.object({
            name: z.string().describe('Tag name.')
          })
        )
        .describe('List of tags used by templates.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      carboneVersion: ctx.config.carboneVersion
    });

    let [categories, tags] = await Promise.all([client.listCategories(), client.listTags()]);

    return {
      output: { categories, tags },
      message: `Found **${categories.length}** categories and **${tags.length}** tags.`
    };
  })
  .build();
