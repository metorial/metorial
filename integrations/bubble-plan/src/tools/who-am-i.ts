import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'who_am_i',
  description: 'Retrieve the Project Bubble user authenticated by the connected API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Authenticated user ID'),
      email: z.string().optional().describe('User email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      avatar: z.string().optional().describe('Avatar URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain ?? ctx.config.domain
    });
    let result = await client.getCurrentUser();
    let user = result?.data?.[0] || result?.data || result;
    if (!user?.user_id) {
      throw createApiServiceError('Project Bubble did not return the authenticated user.', {
        reason: 'missing_authenticated_user'
      });
    }
    return {
      output: {
        userId: String(user.user_id),
        email: user.email || undefined,
        firstName: user.first_name || undefined,
        lastName: user.last_name || undefined,
        avatar: user.avatar || undefined
      },
      message: `Retrieved authenticated user **${user.user_id}**.`
    };
  })
  .build();
