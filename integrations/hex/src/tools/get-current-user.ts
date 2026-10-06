import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Read the authenticated Hex workspace identity and, for personal tokens, the current user. Workspace tokens omit user details. No token value is returned.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceId: z.string(),
      userId: z.string().optional(),
      name: z.string().nullable().optional(),
      email: z.string().optional(),
      role: z.string().optional(),
      lastLoginAt: z.string().nullable().optional(),
      expiresAt: z
        .number()
        .nullable()
        .optional()
        .describe(
          'Provider-reported token expiration (exp), returned unchanged; null means no configured expiry.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const output = await new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl
    }).getCurrentUser();
    return { output, message: 'Retrieved the authenticated Hex workspace identity.' };
  })
  .build();
