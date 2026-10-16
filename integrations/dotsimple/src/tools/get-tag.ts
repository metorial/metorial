import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { spec } from '../spec';

export let getTag = SlateTool.create(spec, {
  name: 'Get Tag',
  key: 'get_tag',
  description: 'Retrieve a tag by UUID. Call list_tags to find available tags.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ workspaceId, tagUuid: z.string().describe('Tag UUID from list_tags') }))
  .output(
    z.object({
      tagId: z.number().optional(),
      tagUuid: z.string().optional(),
      name: z.string().optional(),
      hexColor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.input.workspaceId ?? ctx.config.workspaceId
    });
    let tag = await client.getTag(ctx.input.tagUuid);
    return {
      output: {
        tagId: tag?.id,
        tagUuid: tag?.uuid,
        name: tag?.name,
        hexColor: tag?.hex_color
      },
      message: 'Retrieved the tag.'
    };
  })
  .build();
