import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description:
    'Discover Whop business accounts visible to your credentials. Pass an accountId as companyId to company-scoped tools. User tokens return the user’s business accounts; account API keys return the requesting account and its connected accounts.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search by account title or ID'),
      cursor: z.string().optional().describe('Pagination cursor from endCursor'),
      limit: z.number().optional().describe('Number of accounts to return (1–50)')
    })
  )
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.string().describe('Account ID, usable as companyId in other tools'),
          title: z.string().describe('Account title'),
          route: z.string().describe('Account route'),
          description: z.string().nullable().describe('Account description'),
          status: z.string().nullable().describe('Account status'),
          createdAt: z.string().describe('ISO 8601 creation timestamp')
        })
      ),
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.limit !== undefined &&
      (!Number.isInteger(ctx.input.limit) || ctx.input.limit < 1 || ctx.input.limit > 50)
    ) {
      throw createApiServiceError('limit must be a whole number between 1 and 50.');
    }
    let client = new WhopClient(ctx.auth.token);
    let result = await client.listAccounts({
      query: ctx.input.query,
      after: ctx.input.cursor,
      first: ctx.input.limit
    });
    let accounts = (result.data || []).map(
      (account: {
        id: string;
        title: string;
        route: string;
        description: string | null;
        status: string | null;
        created_at: string;
      }) => ({
        accountId: account.id,
        title: account.title,
        route: account.route,
        description: account.description,
        status: account.status,
        createdAt: account.created_at
      })
    );
    return {
      output: {
        accounts,
        hasNextPage: result.page_info?.has_next_page || false,
        endCursor: result.page_info?.end_cursor || null
      },
      message: `Found ${accounts.length} Whop accounts.`
    };
  })
  .build();
