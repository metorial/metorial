import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCapabilities = SlateTool.create(spec, {
  name: 'Get Account Capabilities',
  key: 'get_capabilities',
  description:
    'Discover the countries, historical date ranges, and datasets available in your Similarweb subscription, plus remaining account credits. Use this before choosing country and date filters for website rankings.',
  constraints: ['This account-management request does not consume data credits.'],
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      remainingHits: z.number().describe('Data credits remaining at the account level.'),
      capabilities: z
        .record(z.string(), z.unknown())
        .describe(
          'Subscription capabilities as returned by Similarweb, including dataset-specific countries and snapshot intervals when available.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCapabilities();
    return {
      output: result,
      message: `Retrieved your account capabilities and **${result.remainingHits}** remaining data credits.`
    };
  })
  .build();
