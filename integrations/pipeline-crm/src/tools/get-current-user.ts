import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated Pipeline CRM user and their account administrator status.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('Authenticated user ID'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      isAccountAdmin: z.boolean().describe('Whether this user is an account administrator')
    })
  )
  .handleInvocation(async ctx => {
    let profile = await new Client(ctx.auth).getProfile();
    return {
      output: {
        userId: profile.id,
        firstName: profile.first_name ?? null,
        lastName: profile.last_name ?? null,
        isAccountAdmin: profile.is_account_admin
      },
      message: `Retrieved current user (ID: **${profile.id}**)`
    };
  })
  .build();
