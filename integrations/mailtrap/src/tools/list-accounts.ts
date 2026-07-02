import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List all Mailtrap accounts accessible with the current API token. Returns account IDs, names, and access levels. Useful for discovering account IDs needed by other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            accountId: z.number().describe('Account ID'),
            name: z.string().describe('Account name'),
            accessLevels: z
              .array(z.number())
              .optional()
              .describe('Access levels (1000=owner, 100=admin, 10=viewer)')
          })
        )
        .describe('List of accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listAccounts();
    let accounts = (Array.isArray(result) ? result : []).map((a: any) => ({
      accountId: a.id,
      name: a.name || '',
      accessLevels: a.access_levels
    }));

    return {
      output: { accounts },
      message: `Found **${accounts.length}** account(s).`
    };
  })
  .build();
