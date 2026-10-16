import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { readItem } from '../lib/responses';
import { mapUser, userSchema } from '../lib/users';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description:
    'Retrieve an organizer or sub-organizer profile by user ID. Call list_users to discover IDs. This does not identify the API-key owner.',
  tags: { readOnly: true }
})
  .input(z.object({ userId: z.string().describe('User ID from list_users') }))
  .output(
    userSchema.extend({
      raw: z.unknown().optional().describe('Complete response returned by Eventzilla')
    })
  )
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).getUser(ctx.input.userId);
    let user = mapUser(readItem(data, 'users'));
    return {
      output: { ...user, raw: data },
      message: `Retrieved Eventzilla organizer ${user.userId}.`
    };
  })
  .build();
