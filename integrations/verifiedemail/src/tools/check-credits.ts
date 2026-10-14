import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCredits = SlateTool.create(spec, {
  name: 'Check Credits',
  key: 'check_credits',
  description: `Check the current credit balance on your VerifiedEmail account. Returns available pay-as-you-go credits and automatic verification entitlements.

Use this to monitor your remaining verification credits before running bulk operations.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      available: z.number().describe('Number of credits currently available'),
      used: z.number().optional().describe('Total number of credits used'),
      autoRefillEnabled: z
        .boolean()
        .optional()
        .describe('Whether auto-refill is enabled for this account, when reported'),
      payAsYouGo: z
        .object({ credits: z.number(), needed: z.number().optional() })
        .describe('Standard verification credits and list demand'),
      autoVerify: z
        .object({ credits: z.number().optional(), needed: z.number().optional() })
        .optional()
        .describe('Automatic verification capacity and current usage')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let credits = await client.getCredits();

    return {
      output: credits,
      message: `**${credits.available}** pay-as-you-go verification credits available.`
    };
  })
  .build();
