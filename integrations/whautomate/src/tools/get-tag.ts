import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTag = SlateTool.create(spec, {
  name: 'Get Tag',
  key: 'get_tag',
  description:
    'Retrieve a client or contact tag by its ID. Use manage_client_tags or manage_contact_tags with list_tags to discover tag IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      entity: z
        .enum(['client', 'contact'])
        .describe('Whether this is a client tag or a contact tag'),
      tagId: z.string().min(1).describe('Tag ID from the corresponding list_tags action')
    })
  )
  .output(
    z.object({
      tag: z.record(z.string(), z.any()).describe('Tag details, including its ID and name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiHost: ctx.config.apiHost });
    let tag =
      ctx.input.entity === 'client'
        ? await client.getClientTag(ctx.input.tagId)
        : await client.getContactTag(ctx.input.tagId);
    return {
      output: { tag },
      message: `Retrieved ${ctx.input.entity} tag **${tag.name || ctx.input.tagId}**.`
    };
  })
  .build();
