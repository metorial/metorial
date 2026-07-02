import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Deactivate and remove a user from the Retool organization. This disables the user's access to the organization.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The ID of the user to delete/deactivate')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    await client.deleteUser(ctx.input.userId);

    return {
      output: {
        userId: ctx.input.userId,
        deleted: true
      },
      message: `User \`${ctx.input.userId}\` has been deactivated.`
    };
  })
  .build();
