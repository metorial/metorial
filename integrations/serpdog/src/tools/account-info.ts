import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let accountInfo = SlateTool.create(spec, {
  name: 'Account Info',
  key: 'account_info',
  description: `Retrieve your Serpdog account information including email, plan name, quota, and remaining requests.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountDetails: z
        .any()
        .describe('Account information including plan, quota, and remaining requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getAccountInfo();

    return {
      output: { accountDetails: data },
      message: `Retrieved Serpdog account information.`
    };
  })
  .build();
