import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List all Drip accounts accessible to the authenticated user. Use this to find account IDs for configuring the integration.`,
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
            accountId: z.string(),
            name: z.string().optional(),
            primaryEmail: z.string().optional(),
            createdAt: z.string().optional(),
            url: z.string().optional()
          })
        )
        .describe('List of Drip accounts.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let result = await client.listAccounts();
    let accounts = (result.accounts ?? []).map((a: any) => ({
      accountId: a.id ?? '',
      name: a.name,
      primaryEmail: a.primary_email,
      createdAt: a.created_at,
      url: a.url
    }));

    return {
      output: { accounts },
      message: `Found **${accounts.length}** accessible accounts.`
    };
  })
  .build();
