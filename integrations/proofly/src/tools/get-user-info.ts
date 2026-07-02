import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserInfo = SlateTool.create(spec, {
  name: 'Get User Info',
  key: 'get_user_info',
  description: `Retrieve the authenticated user's account information including name, email, registration date, login history, and impression statistics (current period and total).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().optional().describe('User name'),
      email: z.string().optional().describe('User email address'),
      registeredAt: z.string().optional().describe('Account registration date'),
      lastLoginAt: z.string().optional().describe('Last login timestamp'),
      impressionsCurrent: z
        .number()
        .optional()
        .describe('Impressions in the current billing period'),
      impressionsTotal: z.number().optional().describe('Total impressions across all periods')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getUser();

    return {
      output: {
        name: user.name,
        email: user.email,
        registeredAt: user.registeredAt ?? user.registered_at ?? user.createdAt,
        lastLoginAt: user.lastLoginAt ?? user.last_login_at,
        impressionsCurrent: user.impressionsCurrent ?? user.impressions_current,
        impressionsTotal: user.impressionsTotal ?? user.impressions_total
      },
      message: `Retrieved account info for **${user.name ?? user.email ?? 'user'}**.`
    };
  })
  .build();
