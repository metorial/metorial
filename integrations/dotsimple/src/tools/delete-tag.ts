import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTag = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Delete a tag from the workspace by its UUID. Posts previously associated with the tag will no longer have it.`,
  constraints: ['This action is irreversible.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      tagUuid: z.string().describe('UUID of the tag to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    await client.deleteTag(ctx.input.tagUuid);

    return {
      output: { success: true },
      message: `Tag \`${ctx.input.tagUuid}\` deleted successfully.`
    };
  })
  .build();
