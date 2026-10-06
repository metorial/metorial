import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Identify the authenticated Gitea user and discover the username used to own repositories.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      username: z.string(),
      fullName: z.string(),
      email: z.string().optional(),
      htmlUrl: z.string().optional(),
      avatarUrl: z.string().optional(),
      isAdmin: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const user = await new GiteaClient(ctx.auth).getAuthenticatedUser();
    return {
      output: {
        userId: user.id,
        username: user.login,
        fullName: user.full_name || user.login,
        email: user.email || undefined,
        htmlUrl: user.html_url || undefined,
        avatarUrl: user.avatar_url || undefined,
        isAdmin: user.is_admin
      },
      message: `Authenticated as **${user.login}**.`
    };
  })
  .build();
