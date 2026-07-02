import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      account: z.record(z.string(), z.any()).describe('Account details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.getAccount();
    let account = result?.account || result;

    return {
      output: { account },
      message: `Retrieved account **${account?.name || 'unknown'}**.`
    };
  })
  .build();
