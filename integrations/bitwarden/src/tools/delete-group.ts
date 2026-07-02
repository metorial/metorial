import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Permanently delete a group from the Bitwarden organization. Members in the group will lose any permissions granted through the group.`,
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
      deleted: z.boolean().describe('Whether the group was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    await client.deleteGroup(ctx.input.groupId);

    return {
      output: { deleted: true },
      message: `Deleted group **${ctx.input.groupId}**.`
    };
  })
  .build();
