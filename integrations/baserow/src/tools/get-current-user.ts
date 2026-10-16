import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Verify the JWT connection and retrieve the current Baserow user. Requires a JWT connection with a refresh token.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z
        .object({
          username: z.string().describe('Account email address'),
          first_name: z.string().describe('Account name')
        })
        .catchall(z.any())
    })
  )
  .handleInvocation(async ctx => {
    let user = await getClient(ctx).getCurrentUser();
    return { output: { user }, message: `Retrieved current user **${user.username}**.` };
  })
  .build();
