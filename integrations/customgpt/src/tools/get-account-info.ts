import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve the current user's profile and account usage limits. Provides information about the authenticated user and their subscription capacity.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z.record(z.string(), z.unknown()).nullable().describe('User profile information'),
      limits: z.record(z.string(), z.unknown()).nullable().describe('Account usage and limits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    let user: Record<string, unknown> | null = null;
    let limits: Record<string, unknown> | null = null;

    try {
      user = await client.getUser();
    } catch (_e) {
      ctx.warn('Could not retrieve user profile');
    }

    try {
      limits = await client.getAccountLimits();
    } catch (_e) {
      ctx.warn('Could not retrieve account limits');
    }

    let userName = user?.name ?? user?.email ?? 'Unknown';

    return {
      output: { user, limits },
      message: `Retrieved account info for **${userName}**.`
    };
  })
  .build();
