import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchAccounts = SlateTool.create(spec, {
  name: 'Search Accounts',
  key: 'search_accounts',
  description: `Searches and lists company/organization accounts. Supports text search and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter accounts by name'),
      limit: z.number().optional().describe('Maximum number of accounts to return'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.string(),
          name: z.string(),
          accountUrl: z.string().optional(),
          contactCount: z.number().optional(),
          dealCount: z.number().optional()
        })
      ),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let params: Record<string, any> = {};
    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listAccounts(params);

    let accounts = (result.accounts || []).map((a: any) => ({
      accountId: a.id,
      name: a.name,
      accountUrl: a.accountUrl || undefined,
      contactCount: a.contactCount ? Number(a.contactCount) : undefined,
      dealCount: a.dealCount ? Number(a.dealCount) : undefined
    }));

    let totalCount = result.meta?.total ? Number(result.meta.total) : undefined;

    return {
      output: { accounts, totalCount },
      message: `Found **${accounts.length}** accounts.`
    };
  })
  .build();
