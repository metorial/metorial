import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAccountsTool = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List dbt Cloud accounts accessible to the token on the configured base URL. Use this when an account-scoped tool needs accountId and the user has not already provided one. For single-account tokens, account-scoped tools can omit accountId; for multi-account tokens, call this tool and pass the selected accountId to the next tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of accounts to return'),
      offset: z.number().optional().describe('Number of accounts to skip for pagination')
    })
  )
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            accountId: z.string().describe('dbt Cloud account ID to pass to other tools'),
            name: z.string().optional().describe('Account name'),
            plan: z.string().optional().describe('Account plan tier'),
            state: z.number().optional().describe('Account state'),
            runSlots: z.number().optional().describe('Number of available run slots'),
            developerSeats: z.number().optional().describe('Number of developer seats'),
            createdAt: z.string().optional().describe('Account creation timestamp')
          })
        )
        .describe('Accessible dbt Cloud accounts'),
      baseUrl: z.string().describe('Configured dbt Cloud base URL used for discovery')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let accounts = (
      await client.listAccounts({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      })
    ).map((account: any) => ({
      accountId: String(account.id),
      name: account.name,
      plan: account.plan,
      state: account.state,
      runSlots: account.run_slots,
      developerSeats: account.developer_seats,
      createdAt: account.created_at
    }));

    return {
      output: {
        accounts,
        baseUrl: client.baseUrl
      },
      message: `Found **${accounts.length}** accessible dbt Cloud account(s). Pass the selected accountId to account-scoped tools when needed.`
    };
  })
  .build();
