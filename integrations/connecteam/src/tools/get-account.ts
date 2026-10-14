import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: 'Retrieve the company ID and name for the connected Connecteam account.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ companyId: z.string(), companyName: z.string() }))
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      ...ctx.auth,
      baseUrl: ctx.auth.baseUrl ?? (ctx.config as { baseUrl?: string }).baseUrl
    });
    let account = await client.getAccount();
    return { output: account, message: `Connected to **${account.companyName}**.` };
  })
  .build();
