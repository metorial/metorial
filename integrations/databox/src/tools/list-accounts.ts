import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `Retrieves all Databox accounts accessible to the authenticated user. Returns account IDs, names, and types. Use this to identify the correct **accountId** needed when creating data sources.`,
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
            accountId: z.number().describe('Unique account identifier'),
            accountName: z.string().describe('Human-readable account name'),
            accountType: z.string().describe('Type of account (e.g. "organization")')
          })
        )
        .describe('List of accessible Databox accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let accounts = await client.listAccounts();

    return {
      output: {
        accounts: accounts.map(a => ({
          accountId: a.id,
          accountName: a.name,
          accountType: a.accountType
        }))
      },
      message: `Found **${accounts.length}** accessible account(s).`
    };
  })
  .build();
