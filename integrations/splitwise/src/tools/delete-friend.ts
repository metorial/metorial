import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteFriend = SlateTool.create(spec, {
  name: 'Delete Friend',
  key: 'delete_friend',
  description: `Remove a friend from the authenticated user's Splitwise account. The friendship can only be removed if there is no outstanding balance.`,
  constraints: ['Cannot delete a friend with a non-zero balance. Settle all debts first.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      friendId: z.number().describe('The user ID of the friend to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteFriend(ctx.input.friendId);

    return {
      output: { success: result.success !== false },
      message: `Removed friend ${ctx.input.friendId}`
    };
  })
  .build();
