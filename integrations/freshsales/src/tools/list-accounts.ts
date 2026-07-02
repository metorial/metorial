import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List accounts (companies) from a saved view in Freshsales. Use the **listFilters** tool to get available view IDs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      viewId: z.number().describe('View ID to list accounts from'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      sort: z.string().optional().describe('Field to sort by'),
      sortType: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.number(),
          name: z.string().nullable().optional(),
          website: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
          city: z.string().nullable().optional(),
          country: z.string().nullable().optional(),
          createdAt: z.string().nullable().optional(),
          updatedAt: z.string().nullable().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listAccounts(ctx.input.viewId, {
      page: ctx.input.page,
      sort: ctx.input.sort,
      sortType: ctx.input.sortType
    });

    let accounts = result.salesAccounts.map((a: Record<string, any>) => ({
      accountId: a.id,
      name: a.name,
      website: a.website,
      phone: a.phone,
      city: a.city,
      country: a.country,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: {
        accounts,
        total: result.meta?.total
      },
      message: `Found **${accounts.length}** accounts (total: ${result.meta?.total ?? 'unknown'}).`
    };
  })
  .build();
