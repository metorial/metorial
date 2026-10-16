import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Retrieve the UserVoice user represented by the connected credentials.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('UserVoice user ID'),
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      isAdmin: z.boolean().optional(),
      raw: z.record(z.string(), z.unknown()).describe('Full provider user record')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain,
      legacySubdomain: ctx.config.subdomain
    }).getCurrentUser();
    if (!user) throw createApiServiceError('UserVoice did not return the current user.');
    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email_address,
        isAdmin: user.is_admin,
        raw: user
      },
      message: 'Retrieved the connected UserVoice user.'
    };
  })
  .build();
