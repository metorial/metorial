import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let getRemainingQuota = SlateTool.create(spec, {
  name: 'Get Remaining Quota',
  key: 'get_remaining_quota',
  description: `Check remaining API credits and account quota. For wallet billing, credit quota is null; details include the currency and balance.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      remainingQuota: z.number().nullable().describe('Remaining API credits'),
      details: z.record(z.string(), z.unknown()).describe('Detailed quota breakdown')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient(ctx.auth);

    let result = await client.getRemainingQuota();

    return {
      output: result,
      message:
        result.remainingQuota === null
          ? 'This account does not expose a credit quota. See its billing details for the current balance.'
          : `Remaining API credits: **${result.remainingQuota}**`
    };
  })
  .build();
