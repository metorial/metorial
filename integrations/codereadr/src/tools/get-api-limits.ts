import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getApiLimits = SlateTool.create(spec, {
  key: 'get_api_limits',
  name: 'Get API Limits',
  description:
    'Retrieve the account API request allowance and requests remaining for each tracked time period. A value of -1 means unlimited.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      limits: z.array(z.object({ metric: z.string(), limit: z.string(), left: z.string() }))
    })
  )
  .handleInvocation(async ctx => {
    let limits = await new Client(ctx.auth.token).retrieveLimits();
    return {
      output: { limits },
      message: `Retrieved API limits for **${limits.length}** time period(s).`
    };
  })
  .build();
