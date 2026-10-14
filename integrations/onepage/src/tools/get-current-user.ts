import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Get the authenticated OnePageCRM user, including their identity and account permissions.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Authenticated user ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      companyName: z.string().optional().describe('Company name'),
      accountRights: z.array(z.string()).optional().describe('Account permissions'),
      photoUrl: z.string().optional().describe('Profile photo URL'),
      countryCode: z.string().optional().describe('ISO-3166 country code')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new Client(ctx.auth).getCurrentUser();
    return {
      output: user,
      message: `Authenticated as ${[user.firstName, user.lastName].filter(Boolean).join(' ') || user.userId}.`
    };
  })
  .build();
