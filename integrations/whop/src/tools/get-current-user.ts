import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the signed-in Whop user’s identity using an OAuth connection. Requires openid; profile and email fields depend on the granted scopes. API keys do not support this endpoint.',
  tags: { readOnly: true }
})
  .scopes(anyOf('openid'))
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Authenticated user ID'),
      username: z.string().nullable(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      emailVerified: z.boolean().nullable(),
      profilePictureUrl: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let user = await new WhopClient(ctx.auth.token).getCurrentUser();
    return {
      output: {
        userId: user.sub,
        username: user.preferred_username ?? null,
        name: user.name ?? null,
        email: user.email ?? null,
        emailVerified: user.email_verified ?? null,
        profilePictureUrl: user.picture ?? null
      },
      message: `Authenticated as Whop user ${user.preferred_username || user.sub}.`
    };
  })
  .build();
