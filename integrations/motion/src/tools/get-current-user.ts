import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the user who owns the connected Motion API key, including their ID, name, and email.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('ID of the authenticated user'),
      name: z.string().optional().describe('User display name'),
      email: z.string().describe('User email address')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new MotionClient({ token: ctx.auth.token }).getMe();
    return {
      output: { userId: user.id, name: user.name, email: user.email },
      message: `Retrieved Motion user **${user.name || user.email}**`
    };
  })
  .build();
