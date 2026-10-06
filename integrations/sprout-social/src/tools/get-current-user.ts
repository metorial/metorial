import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Read the authenticated Sprout user identity through user-based OAuth. Personal API tokens do not support this identity endpoint; use list_customers to discover their authorized accounts.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({ userId: z.string(), email: z.string().optional(), name: z.string().optional() })
  )
  .handleInvocation(async ctx => {
    if (ctx.auth.authMethod === 'api_token')
      throw createApiServiceError(
        'Use user-based OAuth for get_current_user. Personal API tokens expose authorized accounts through list_customers, not a current-user identity.',
        { reason: 'unsupported_auth_method' }
      );
    const user = await new Client(ctx.auth).getCurrentUser();
    return {
      output: {
        userId: user.sub,
        email: user.email ?? undefined,
        name: [user.given_name, user.family_name].filter(Boolean).join(' ') || undefined
      },
      message: 'Retrieved the authenticated OAuth user.'
    };
  });
