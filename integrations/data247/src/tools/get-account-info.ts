import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Information',
  key: 'get_account_info',
  description:
    'Get the account capabilities, available service rates, account balance, and authorized Do-Not-Call area codes for your API key. Use this to discover restricted-service access before running lookups.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      account: z
        .record(z.string(), z.unknown())
        .describe(
          'Account balance, access capabilities, authorized area codes, and service rates'
        )
    })
  )
  .handleInvocation(async ctx => {
    let account = await new Client(ctx.auth.token).getAccountInfo();
    return {
      output: { account },
      message: 'Retrieved account capabilities and service rates.'
    };
  })
  .build();
