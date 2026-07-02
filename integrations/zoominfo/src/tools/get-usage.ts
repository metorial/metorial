import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get API Usage',
  key: 'get_usage',
  description: `Retrieve current API usage statistics and credit consumption. Returns information about how many credits and API calls have been consumed and how many remain for the current billing period.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      usage: z
        .record(z.string(), z.any())
        .describe(
          'Usage statistics including credit consumption, API call counts, and remaining allowances'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.getUsage();

    return {
      output: { usage: result },
      message: `Retrieved API usage data successfully.`
    };
  })
  .build();
