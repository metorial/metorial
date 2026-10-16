import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCategory = SlateTool.create(spec, {
  name: 'Get Category',
  key: 'get_category',
  description: 'Retrieve a category by ID with its raw attributes and relationships.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      categoryId: z.string().describe('Category ID from list_categories')
    })
  )
  .output(
    z.object({
      categoryId: z.string(),
      attributes: z.record(z.string(), z.any()),
      relationships: z.record(z.string(), z.any()).optional(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });
    let res = await client.getCategory(ctx.input.categoryId);
    return {
      output: {
        categoryId: res.data.id,
        attributes: res.data.attributes,
        relationships: res.data.relationships,
        raw: res
      },
      message: `Retrieved category **${res.data.id}**.`
    };
  })
  .build();
