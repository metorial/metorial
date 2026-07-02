import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroupMembers = SlateTool.create(spec, {
  name: 'Manage Group Members',
  key: 'manage_group_members',
  description: `Add or remove a user from a Splitwise group. Use this to manage group membership.`,
  constraints: ['Removing a user will fail if they have a non-zero balance in the group.']
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the user'),
      groupId: z.number().describe('The group ID'),
      userId: z.number().describe('The user ID to add or remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'add') {
      let result = await client.addUserToGroup(ctx.input.groupId, ctx.input.userId);
      return {
        output: { success: result.success !== false },
        message: `Added user ${ctx.input.userId} to group ${ctx.input.groupId}`
      };
    } else {
      let result = await client.removeUserFromGroup(ctx.input.groupId, ctx.input.userId);
      return {
        output: { success: result.success !== false },
        message: `Removed user ${ctx.input.userId} from group ${ctx.input.groupId}`
      };
    }
  })
  .build();
