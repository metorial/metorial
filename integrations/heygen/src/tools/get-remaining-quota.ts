import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let getRemainingQuota = SlateTool.create(spec, {
  name: 'Get Remaining Quota',
  key: 'get_remaining_quota',
  description: `Check remaining API credits and account quota. API usage is measured in credits — as a general rule, 1 credit = 1 minute of generated avatar video.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      remainingQuota: z.number().describe('Remaining API credits'),
      details: z.record(z.string(), z.any()).describe('Detailed quota breakdown')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.getRemainingQuota();

    return {
      output: result,
      message: `Remaining API credits: **${result.remainingQuota}**`
    };
  })
  .build();
