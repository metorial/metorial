import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete File Group',
  key: 'delete_group',
  description:
    'Delete a file group. This removes the group itself and preserves its member files.',
  tags: { destructive: true }
})
  .input(
    z.object({
      groupId: z
        .string()
        .describe('Group ID in UUID~N format; discover groups with list_groups')
    })
  )
  .output(
    z.object({ deleted: z.boolean().describe('Whether Uploadcare confirmed the deletion') })
  )
  .handleInvocation(async ctx => {
    await new Client(ctx.auth).deleteGroup(ctx.input.groupId);
    return {
      output: { deleted: true },
      message: 'Deleted the file group. Its member files remain available.'
    };
  })
  .build();
