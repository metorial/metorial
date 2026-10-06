import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Get the authenticated Turso user, account plan and security status.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      username: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
      avatarUrl: z.string().optional(),
      plan: z.string().optional(),
      mfa: z.boolean().optional(),
      hasPendingInvites: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const { user } = await new Client({ token: ctx.auth.token }).getCurrentUser();
    return {
      output: {
        username: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        plan: user.plan,
        mfa: user.mfa,
        hasPendingInvites: user.has_pending_invites
      },
      message: `Retrieved user **${user.username}**.`
    };
  })
  .build();
