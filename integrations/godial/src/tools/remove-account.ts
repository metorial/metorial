import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeAccount = SlateTool.create(spec, {
  name: 'Remove Account',
  key: 'remove_account',
  description: `Permanently remove an account (member) from the GoDial organization. This action is **irreversible** — the member will lose access and all associated data may be removed. Use the **List Accounts** tool first to find the account ID.`,
  tags: {
    destructive: true
  },
  constraints: ['This action cannot be undone. The account will be permanently deleted.']
})
  .input(
    z.object({
      accountId: z.string().describe('ID of the account to remove')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Deletion result from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.removeAccount(ctx.input.accountId);

    return {
      output: { result },
      message: `Account \`${ctx.input.accountId}\` has been removed.`
    };
  })
  .build();
