import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Disable a user in the Retool organization. The legacy deleted flag reports a successful disable receipt; it does not mean permanent account erasure. This disables the user's access to the organization.`,
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
    let client = clientFor(ctx);

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
