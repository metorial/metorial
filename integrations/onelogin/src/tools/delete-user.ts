import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user from the OneLogin directory. This action cannot be undone.`,
  constraints: ['This is a permanent deletion and cannot be reversed.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    await client.deleteUser(ctx.input.userId);

    return {
      output: { success: true },
      message: `Deleted user with ID **${ctx.input.userId}**.`
    };
  });
