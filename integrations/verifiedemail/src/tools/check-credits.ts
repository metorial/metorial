import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCredits = SlateTool.create(spec, {
  name: 'Check Credits',
  key: 'check_credits',
  description: `Check the current credit balance on your VerifiedEmail account. Returns available credits, total credits used, and whether auto-refill is enabled.

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
      used: z.number().describe('Total number of credits used'),
      autoRefillEnabled: z
        .boolean()
        .describe('Whether auto-refill is enabled for this account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let credits = await client.getCredits();

    return {
      output: credits,
      message: `**${credits.available}** credits available (${credits.used} used). Auto-refill is **${credits.autoRefillEnabled ? 'enabled' : 'disabled'}**.`
    };
  })
  .build();
