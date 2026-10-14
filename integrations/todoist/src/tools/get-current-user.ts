import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated Todoist user, including their user ID, name, email, timezone, and Inbox project ID.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Authenticated user ID'),
      name: z.string().describe('Full name'),
      email: z.string().describe('Email address'),
      imageUrl: z.string().optional().describe('Profile image URL'),
      inboxProjectId: z.string().nullable().describe('Inbox project ID when available'),
      timezone: z.string().optional().describe('Account timezone'),
      isPremium: z.boolean().describe('Whether the user has premium access')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new Client({ token: ctx.auth.token }).getUser();
    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
        inboxProjectId: user.inboxProjectId,
        timezone: user.timezone,
        isPremium: user.isPremium
      },
      message: `Connected as **${user.name}** (ID: ${user.id}).`
    };
  });
