import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUserTool = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user from Canny. This removes the user and all their associated data. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The Canny user ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    await client.deleteUser(ctx.input.userId);

    return {
      output: { success: true },
      message: `Deleted user **${ctx.input.userId}**.`
    };
  })
  .build();
