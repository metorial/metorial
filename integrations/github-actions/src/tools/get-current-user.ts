import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Identify the GitHub user represented by the connected OAuth token or personal access token.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('GitHub user ID'),
      login: z.string().describe('GitHub username'),
      name: z.string().nullable().describe('Public display name'),
      email: z.string().nullable().describe('Public email, when available'),
      htmlUrl: z.string().describe('GitHub profile URL'),
      avatarUrl: z.string().describe('Profile image URL')
    })
  )
  .handleInvocation(async ctx => {
    const user = await new GitHubActionsClient(ctx.auth.token).getCurrentUser();
    return {
      output: {
        userId: user.id,
        login: user.login,
        name: user.name ?? null,
        email: user.email ?? null,
        htmlUrl: user.html_url,
        avatarUrl: user.avatar_url
      },
      message: `Connected as **${user.login}**.`
    };
  })
  .build();
