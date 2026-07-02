import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Permanently delete a credential group by its ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to delete')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('ID of the deleted group'),
      deleted: z.boolean().describe('Whether the group was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteGroup(ctx.input.groupId);

    return {
      output: {
        groupId: ctx.input.groupId,
        deleted: true
      },
      message: `Group \`${ctx.input.groupId}\` has been permanently deleted.`
    };
  })
  .build();
