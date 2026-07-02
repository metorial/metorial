import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List all Netlify accounts/teams accessible by the authenticated user. Returns account IDs and slugs needed for other operations like managing environment variables and DNS zones.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.string().describe('Unique account identifier'),
          accountName: z.string().describe('Account name'),
          accountSlug: z.string().describe('Account slug'),
          accountType: z.string().optional().describe('Account type'),
          sitesCount: z.number().optional().describe('Number of sites in the account'),
          createdAt: z.string().optional().describe('Account creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let accounts = await client.listAccounts();

    let mapped = accounts.map((account: any) => ({
      accountId: account.id,
      accountName: account.name || '',
      accountSlug: account.slug || '',
      accountType: account.type,
      sitesCount: account.sites_count,
      createdAt: account.created_at
    }));

    return {
      output: { accounts: mapped },
      message: `Found **${mapped.length}** account(s).`
    };
  })
  .build();
