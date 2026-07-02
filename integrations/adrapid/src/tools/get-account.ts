import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve information about the currently authenticated Adrapid account, including user ID, email, and name.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique identifier of the account'),
      email: z.string().optional().describe('Email address of the account'),
      name: z.string().optional().describe('Name or username of the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.getAccount();

    return {
      output: {
        userId: account.userId,
        email: account.email,
        name: account.name
      },
      message: `Account: **${account.name || account.email || account.userId}**`
    };
  })
  .build();
