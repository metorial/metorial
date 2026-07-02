import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve current Redis Cloud account details for the authenticated API keys.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.number().optional().describe('Redis Cloud account ID'),
      name: z.string().optional().describe('Account name'),
      ownerName: z.string().optional().describe('Account owner name'),
      ownerEmail: z.string().optional().describe('Account owner email'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let account = await client.getAccount();

    return {
      output: {
        accountId: account.id || account.accountId,
        name: account.name,
        ownerName: account.ownerName,
        ownerEmail: account.ownerEmail,
        raw: account
      },
      message: `Redis Cloud account${account.name ? ` **${account.name}**` : ''} retrieved.`
    };
  })
  .build();
