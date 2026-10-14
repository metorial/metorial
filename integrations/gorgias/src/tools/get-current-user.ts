import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated helpdesk agent and verify the connected account identity.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('Authenticated user ID'),
      email: z.string().nullable().describe('User email'),
      name: z.string().nullable().describe('User name'),
      role: z.string().nullable().describe('User role')
    })
  )
  .handleInvocation(async ctx => {
    let user = await createClient(ctx.config, ctx.auth).getUser(0);
    return {
      output: {
        userId: user.id,
        email: user.email ?? null,
        name: user.name || [user.firstname, user.lastname].filter(Boolean).join(' ') || null,
        role: typeof user.role === 'string' ? user.role : (user.role?.name ?? null)
      },
      message: `Retrieved authenticated user #${user.id}.`
    };
  })
  .build();
