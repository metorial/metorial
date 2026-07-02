import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve information about the current Faraday account, including account name, status, and billing details.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().describe('Unique identifier of the account'),
      name: z.string().describe('Account display name'),
      status: z.string().optional().describe('Current account status'),
      createdAt: z.string().optional().describe('Timestamp when the account was created'),
      updatedAt: z.string().optional().describe('Timestamp when the account was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let account = await client.getCurrentAccount();

    return {
      output: {
        accountId: account.id,
        name: account.name,
        status: account.status,
        createdAt: account.created_at,
        updatedAt: account.updated_at
      },
      message: `Account **${account.name}** is **${account.status}**.`
    };
  })
  .build();
