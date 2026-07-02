import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user account from SimpleKPI.`,
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
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteUser(ctx.input.userId);

    return {
      output: { success: true },
      message: `Deleted user with ID **${ctx.input.userId}**.`
    };
  })
  .build();
