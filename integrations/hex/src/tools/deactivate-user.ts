import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deactivateUser = SlateTool.create(spec, {
  name: 'Deactivate User',
  key: 'deactivate_user',
  description: `Deactivate a user from the Hex workspace. The user will lose access to the workspace. If your workspace uses Directory Sync, users should be managed there instead.`,
  tags: {
    destructive: true
  },
  constraints: [
    'If the workspace uses Directory Sync, users should be managed via Directory Sync rather than through the API.'
  ]
})
  .input(
    z.object({
      userId: z.string().describe('UUID of the user to deactivate')
    })
  )
  .output(
    z.object({
      deactivated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    await client.deactivateUser(ctx.input.userId);

    return {
      output: { deactivated: true },
      message: `Deactivated user **${ctx.input.userId}**.`
    };
  })
  .build();
