import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the user identity associated with the connected Docupilot API credentials.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('User identifier'),
      email: z.string().optional().describe('User email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new Client(ctx.auth).getCurrentUser();
    return {
      output: {
        userId: user.id == null ? undefined : String(user.id),
        email: user.email ?? undefined,
        firstName: user.first_name ?? undefined,
        lastName: user.last_name ?? undefined
      },
      message: 'Retrieved the current Docupilot user.'
    };
  })
  .build();
