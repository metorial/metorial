import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Read the native authenticated management user. Personal tokens use the current-user endpoint; plugin OAuth uses user info and may return only an ID and friendly name.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      region: z.enum(['eu', 'us', 'ca', 'ap', 'cn']),
      credentialMode: z.enum(['pat', 'oauth', 'legacy_raw'])
    })
  )
  .handleInvocation(async ctx => {
    const user = await new StoryblokClient(ctx.auth).getCurrentUser();
    return {
      output: {
        userId: user.id,
        name:
          user.friendly_name ??
          ([user.firstname, user.lastname].filter(Boolean).join(' ') || undefined),
        email: user.email ?? user.real_email,
        region: ctx.auth.region,
        credentialMode: ctx.auth.mode ?? ('legacy_raw' as const)
      },
      message: 'Retrieved the authenticated management user.'
    };
  })
  .build();
