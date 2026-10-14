import { SlateTool } from 'slates';
import { z } from 'zod';
import { PublicApiClient } from '../lib/public-api-client';
import { spec } from '../spec';

export let getAllocatedTrafficLimit = SlateTool.create(spec, {
  name: 'Get Allocated Sub-User Traffic',
  key: 'get_allocated_traffic_limit',
  description:
    'Get the total traffic limit allocated across your residential proxy sub-users, in GB. Use this alongside Get Subscriptions to inspect account capacity.',
  constraints: [
    'Requires API Key authentication (Public API) and a residential proxy subscription.'
  ],
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      allocatedTrafficLimit: z.number().describe('Total traffic allocated to sub-users in GB')
    })
  )
  .handleInvocation(async ctx => {
    let output = await new PublicApiClient(
      ctx.auth.token,
      ctx.auth.authMethod
    ).getAllocatedTrafficLimit();
    return {
      output,
      message: `Residential proxy sub-users have **${output.allocatedTrafficLimit} GB** allocated.`
    };
  })
  .build();
