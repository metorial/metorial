import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountUsage = SlateTool.create(spec, {
  name: 'Get Account Usage',
  key: 'get_account_usage',
  description: 'Retrieve API usage for the account associated with the current API key.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      usage: z.record(z.string(), z.any()).describe('Account usage data returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let usage = await client.getUsage();
    return {
      output: { usage },
      message: 'Retrieved API usage for the current account.'
    };
  })
  .build();
