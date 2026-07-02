import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List company accounts with optional sorting and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., accountName, createdTime)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      from: z.number().optional().describe('Starting index for pagination'),
      limit: z.number().optional().describe('Number of accounts to return (max 100)')
    })
  )
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            accountId: z.string().describe('Account ID'),
            accountName: z.string().optional().describe('Account name'),
            email: z.string().optional().describe('Email address'),
            phone: z.string().optional().describe('Phone number'),
            website: z.string().optional().describe('Website URL'),
            industry: z.string().optional().describe('Industry')
          })
        )
        .describe('List of accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listAccounts({
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      from: ctx.input.from,
      limit: ctx.input.limit
    });

    let data = Array.isArray(result) ? result : result?.data || [];

    let accounts = data.map((a: any) => ({
      accountId: a.id,
      accountName: a.accountName,
      email: a.email,
      phone: a.phone,
      website: a.website,
      industry: a.industry
    }));

    return {
      output: { accounts },
      message: `Found **${accounts.length}** account(s)`
    };
  })
  .build();
