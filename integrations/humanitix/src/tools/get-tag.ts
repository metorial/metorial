import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { tagSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTag = SlateTool.create(spec, {
  name: 'Get Tag',
  key: 'get_tag',
  description:
    'Retrieve an account tag by ID, including its name and owner. Call list_tags to discover tag IDs, or use a tagId returned by get_event or list_events.',
  tags: { readOnly: true }
})
  .input(
    z.object({ tagId: z.string().describe('Tag ID from list_tags or an event tagIds field.') })
  )
  .output(tagSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let tag = await client.getTag(ctx.input.tagId);
    return {
      output: {
        tagId: tag._id,
        name: tag.name,
        userId: tag.userId,
        location: tag.location,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt
      },
      message: `Retrieved tag **${tag.name || ctx.input.tagId}**.`
    };
  })
  .build();
