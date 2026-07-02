import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve your DialMyCalls account information including available credits balance and account creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      creditsAvailable: z.number().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = await client.getAccount();

    return {
      output: {
        creditsAvailable: account.credits_available,
        createdAt: account.created_at
      },
      message: `Account has **${account.credits_available ?? 'N/A'}** credits available.`
    };
  })
  .build();
