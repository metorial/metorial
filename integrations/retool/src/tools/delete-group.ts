import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Delete a permission group from the Retool organization. This removes the group and all associated permissions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.number().describe('The numeric ID of the group to delete')
    })
  )
  .output(
    z.object({
      groupId: z.number(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    await client.deleteGroup(ctx.input.groupId);

    return {
      output: {
        groupId: ctx.input.groupId,
        deleted: true
      },
      message: `Deleted group \`${ctx.input.groupId}\`.`
    };
  })
  .build();
