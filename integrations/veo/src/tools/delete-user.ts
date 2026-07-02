import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user from VEO. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });
    await client.deleteUser(ctx.input.userId);

    return {
      output: { success: true },
      message: `Deleted user \`${ctx.input.userId}\`.`
    };
  })
  .build();
