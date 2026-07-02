import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user from the account. This also removes the user from any widgets they are assigned to.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('The ID of the user to delete')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('The ID of the deleted user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    await client.deleteUser(ctx.input.userId);

    return {
      output: { userId: ctx.input.userId },
      message: `Deleted user **#${ctx.input.userId}**.`
    };
  })
  .build();
