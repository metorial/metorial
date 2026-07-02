import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve detailed information about a specific account by its ID. Returns full account data including contacts, addresses, phone numbers, social profiles, tags, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account to retrieve')
    })
  )
  .output(
    z.object({
      account: z.record(z.string(), z.any()).describe('Full account details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let account = await client.getAccount(ctx.input.accountId);

    return {
      output: { account },
      message: `Retrieved account **${account.name || account.id}**.`
    };
  })
  .build();
