import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUserTool = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user from Auth0. This action is irreversible and removes all associated data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The Auth0 user ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the user was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.deleteUser(ctx.input.userId);

    return {
      output: { deleted: true },
      message: `Deleted user **${ctx.input.userId}**.`
    };
  })
  .build();
