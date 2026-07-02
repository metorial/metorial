import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `Retrieve all accounts (members) in the GoDial organization. Returns account details including names, roles, and IDs. Useful for auditing team members or finding a specific account ID for management operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z.array(z.any()).describe('Array of account records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let accounts = await client.listAccounts();

    return {
      output: { accounts },
      message: `Retrieved **${Array.isArray(accounts) ? accounts.length : 0}** account(s).`
    };
  })
  .build();
