import { SlateTool } from 'slates';
import { z } from 'zod';
import { XForceClient } from '../lib/client';
import { spec } from '../spec';

export let getApiUsage = SlateTool.create(spec, {
  name: 'Get API Usage',
  key: 'get_api_usage',
  description: `Retrieve your current API usage statistics for IBM X-Force Exchange. Shows consumption details per month for each subscription type, including entitlement limits and current usage counts.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      usage: z
        .record(z.string(), z.any())
        .describe('API usage details by subscription and month')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XForceClient({
      token: ctx.auth.token,
      password: ctx.auth.password
    });

    ctx.progress('Fetching API usage...');
    let data = await client.getApiUsage();

    return {
      output: { usage: data },
      message: `Retrieved API usage statistics`
    };
  })
  .build();
