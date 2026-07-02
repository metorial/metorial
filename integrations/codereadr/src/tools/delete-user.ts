import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Delete one or more app users from your CodeREADr account. This permanently removes the user's access to the mobile app.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .describe(
          'User ID to delete. Use comma-separated IDs for multiple, or "all" to delete all users.'
        )
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID(s) of the deleted user(s)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteUser(ctx.input.userId);

    return {
      output: { userId: ctx.input.userId },
      message: `Deleted user(s) **${ctx.input.userId}**.`
    };
  })
  .build();
