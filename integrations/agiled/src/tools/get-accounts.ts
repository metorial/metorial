import { SlateTool } from 'slates';
import { z } from 'zod';
import { PublicClient } from '../lib/public-client';
import { spec } from '../spec';

export let getAccounts = SlateTool.create(spec, {
  name: 'Get Accounts',
  key: 'get_accounts',
  description:
    'List CRM accounts with optional name and email filters, pagination, sorting, and related contacts. Requires a Public API Key connection.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['public_api_key'])
  .input(
    z.object({
      page: z.number().int().min(1).optional().describe('Page number; defaults to 1.'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Accounts per page; defaults to 25, up to 100.'),
      name: z.string().optional().describe('Filter by account name.'),
      email: z.string().optional().describe('Filter by account email.'),
      sortBy: z
        .enum(['created_at', 'updated_at', 'name', 'email'])
        .optional()
        .describe('Field used to sort the accounts.'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
      include: z
        .string()
        .optional()
        .describe('Comma-separated related records: contacts, assigned_user, assigned_users.')
    })
  )
  .output(
    z.object({
      accounts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Account records including IDs and any requested related data.'),
      meta: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Pagination metadata returned by Agiled.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new PublicClient(ctx.auth).list('accounts', {
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      name: ctx.input.name,
      email: ctx.input.email,
      sort_by: ctx.input.sortBy,
      sort_direction: ctx.input.sortDirection,
      include: ctx.input.include
    });
    return {
      output: { accounts: result.data, meta: result.meta },
      message: `Retrieved ${result.data.length} Agiled account(s).`
    };
  })
  .build();
