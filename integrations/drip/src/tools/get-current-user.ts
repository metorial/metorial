import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Read the authenticated Drip user’s email, name and time zone. No account selection is required.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string(),
      name: z.string().optional(),
      timeZone: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).fetchUser();
    const user = result.users[0];
    return {
      output: { email: user.email, name: user.name, timeZone: user.time_zone },
      message: 'Fetched the authenticated Drip user.'
    };
  })
  .build();
