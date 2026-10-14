import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description:
    'Identify the connected Simplero account and user, including the account name and host.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Connected account and user records returned by Simplero')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });
    let accounts = await client.getAccountInfo();
    return {
      output: { accounts },
      message: `Retrieved **${accounts.length}** connected account record(s).`
    };
  })
  .build();
