import { SlateTool } from 'slates';
import { z } from 'zod';
import { legacyBaseUrl, TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the authenticated Travis CI account on the selected hosted or Enterprise API.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('Authenticated user ID'),
      login: z.string().describe('Account login'),
      name: z.string().nullable().describe('Account display name'),
      email: z.string().nullable().describe('Account email'),
      avatarUrl: z.string().nullable().describe('Account avatar URL')
    })
  )
  .handleInvocation(async ctx => {
    const user = await new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? legacyBaseUrl(ctx.config)
    }).getCurrentUser();
    return {
      output: {
        userId: user.id,
        login: user.login,
        name: user.name ?? null,
        email: user.email ?? null,
        avatarUrl: user.avatar_url ?? null
      },
      message: `Authenticated as **${user.login}**.`
    };
  })
  .build();
