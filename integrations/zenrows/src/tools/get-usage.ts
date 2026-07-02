import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Retrieve your ZenRows subscription usage statistics and plan details. Returns real-time data on API usage, remaining credits, plan limits, and subscription status.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      usage: z
        .record(z.string(), z.unknown())
        .describe('Subscription usage details including plan info, credit usage, and limits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let usage = await client.getUsage();

    return {
      output: { usage },
      message: `Retrieved ZenRows subscription usage details.`
    };
  })
  .build();
