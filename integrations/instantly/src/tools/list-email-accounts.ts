import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEmailAccounts = SlateTool.create(spec, {
  name: 'List Email Accounts',
  key: 'list_email_accounts',
  description: `List connected email sending accounts in the workspace. Supports searching, filtering by status and tags, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of accounts to return (1-100).'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination (datetime from previous response).'),
      search: z.string().optional().describe('Search accounts by email address.'),
      status: z.number().optional().describe('Filter by account status.'),
      tagIds: z.string().optional().describe('Comma-separated tag UUIDs to filter accounts.')
    })
  )
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            email: z.string().describe('Account email address'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            status: z.number().optional().describe('Account status'),
            dailyLimit: z.number().optional().describe('Daily sending limit'),
            warmupScore: z.number().optional().describe('Warmup score'),
            providerCode: z.number().optional().describe('Email provider code'),
            setupPending: z.boolean().optional().describe('Whether setup is pending'),
            timestampCreated: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of email accounts'),
      nextStartingAfter: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAccounts({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter,
      search: ctx.input.search,
      status: ctx.input.status,
      tagIds: ctx.input.tagIds
    });

    let accounts = result.items.map((a: any) => ({
      email: a.email,
      firstName: a.first_name,
      lastName: a.last_name,
      status: a.status,
      dailyLimit: a.daily_limit,
      warmupScore: a.stat_warmup_score,
      providerCode: a.provider_code,
      setupPending: a.setup_pending,
      timestampCreated: a.timestamp_created
    }));

    return {
      output: {
        accounts,
        nextStartingAfter: result.next_starting_after
      },
      message: `Found **${accounts.length}** email account(s).${result.next_starting_after ? ' More pages available.' : ''}`
    };
  })
  .build();
