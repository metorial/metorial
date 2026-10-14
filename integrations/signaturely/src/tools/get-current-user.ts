import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the account identity, email, role, and status associated with the connected Signaturely API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Connected user ID'),
      email: z.string().optional().describe('Connected user email'),
      name: z.string().optional().describe('Connected user name'),
      role: z.string().optional().describe('Account role'),
      status: z.string().optional().describe('Account status'),
      avatarUrl: z.string().optional().describe('Account avatar URL')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new Client({ token: ctx.auth.token }).getUser();
    return {
      output: {
        userId: user.id,
        email: user.email ?? undefined,
        name: user.name ?? user.fullName ?? undefined,
        role: user.role ?? undefined,
        status: user.status ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined
      },
      message: `Retrieved the connected Signaturely account ${user.email ?? user.id}.`
    };
  })
  .build();
