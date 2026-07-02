import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing app user's details. Only provided fields are changed; omitted fields remain unchanged.`
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to update'),
      username: z.string().optional().describe('New username'),
      password: z.string().optional().describe('New password'),
      limit: z.string().optional().describe('New device limit per billing period')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the updated user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.updateUser(ctx.input.userId, {
      username: ctx.input.username,
      password: ctx.input.password,
      limit: ctx.input.limit
    });

    return {
      output: { userId: ctx.input.userId },
      message: `Updated user **${ctx.input.userId}** successfully.`
    };
  })
  .build();
