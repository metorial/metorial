import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Delete or restore a Splitwise group. Deleting a group also destroys all associated expenses. Restoring brings a deleted group back.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.number().describe('The group ID to delete or restore'),
      action: z.enum(['delete', 'restore']).describe('Whether to delete or restore the group')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      let result = await client.deleteGroup(ctx.input.groupId);
      return {
        output: { success: result.success !== false },
        message: `Deleted group ${ctx.input.groupId}`
      };
    } else {
      let result = await client.restoreGroup(ctx.input.groupId);
      return {
        output: { success: result.success !== false },
        message: `Restored group ${ctx.input.groupId}`
      };
    }
  })
  .build();
