import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve information about the current Faraday account, including the identity, name, and status associated with the API key.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Account metadata excluding the API key'),
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

    let { api_key: _apiKey, ...raw } = account;

    return {
      output: {
        raw,
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
