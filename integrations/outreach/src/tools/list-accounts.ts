import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildFilterParams, flattenResource } from '../lib/helpers';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `Search and list accounts (companies) from Outreach. Supports filtering by name, domain, and owner. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by account name'),
      domain: z.string().optional().describe('Filter by domain'),
      ownerId: z.string().optional().describe('Filter by owner user ID'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageOffset: z.number().optional().describe('Page offset for pagination'),
      sortBy: z.string().optional().describe('Sort field (e.g. "name", "-createdAt")')
    })
  )
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.string(),
          name: z.string().optional(),
          domain: z.string().optional(),
          industry: z.string().optional(),
          locality: z.string().optional(),
          ownerId: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      hasMore: z.boolean(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let filterParams = buildFilterParams({
      name: ctx.input.name,
      domain: ctx.input.domain,
      'owner/id': ctx.input.ownerId
    });

    let params: Record<string, string> = { ...filterParams };
    if (ctx.input.pageSize) params['page[size]'] = ctx.input.pageSize.toString();
    if (ctx.input.pageOffset !== undefined)
      params['page[offset]'] = ctx.input.pageOffset.toString();
    if (ctx.input.sortBy) params.sort = ctx.input.sortBy;

    let result = await client.listAccounts(params);

    let accounts = result.records.map(r => {
      let flat = flattenResource(r);
      return {
        accountId: flat.id,
        name: flat.name,
        domain: flat.domain,
        industry: flat.industry,
        locality: flat.locality,
        ownerId: flat.ownerId,
        updatedAt: flat.updatedAt
      };
    });

    return {
      output: {
        accounts,
        hasMore: result.hasMore,
        totalCount: result.totalCount ?? undefined
      },
      message: `Found **${accounts.length}** accounts${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
