import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { readAccount } from '../lib/response';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve account details from Breathe HR, including the account's unique identifier, name, domain, and UUID.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      account: z.record(z.string(), z.unknown()).describe('Account details')
    })
  )
  .handleInvocation(async ctx => {
    const account = readAccount(
      await new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      }).getAccount()
    );
    return { output: { account }, message: 'Retrieved the authenticated account.' };
  })
  .build();
