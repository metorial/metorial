import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Retrieve the authenticated Pilvio user and profile.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('Pilvio user ID'),
      cookieId: z.string().optional().describe('Stable user cookie identifier'),
      name: z.string().optional().describe('Account name'),
      email: z.string().optional().describe('Profile email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      raw: z.unknown().optional().describe('Complete provider user response')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new PilvioClient({ token: ctx.auth.token }).getUser();
    return {
      output: {
        userId: user.id,
        cookieId: user.cookie_id ?? undefined,
        name: user.name ?? undefined,
        email: user.profile_data?.email ?? undefined,
        firstName: user.profile_data?.first_name ?? undefined,
        lastName: user.profile_data?.last_name ?? undefined,
        raw: user
      },
      message: 'Retrieved the authenticated Pilvio user.'
    };
  })
  .build();
