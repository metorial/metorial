import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve one or more account (company) records from ForceManager.
Fetch a single account by ID, or list/search accounts with optional filtering using ForceManager query syntax.`,
  instructions: [
    'To search by name, use the "name" search parameter which performs a LIKE match.',
    'For advanced filtering, use the "query" parameter with ForceManager query syntax, e.g. `city=\'Madrid\' AND statusId=1`.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.number().optional().describe('Specific account ID to retrieve'),
      query: z
        .string()
        .optional()
        .describe(
          'ForceManager query language filter (e.g. "city=\'Madrid\' AND statusId=1")'
        ),
      name: z.string().optional().describe('Search by company name (LIKE match)'),
      page: z.number().optional().describe('Page number for paginated results (0-indexed)')
    })
  )
  .output(
    z.object({
      accounts: z.array(z.any()).describe('List of matching account records'),
      totalCount: z.number().describe('Number of records returned'),
      nextPage: z.number().nullable().describe('Next page number, or null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.accountId) {
      let account = await client.getCompany(ctx.input.accountId);
      return {
        output: { accounts: [account], totalCount: 1, nextPage: null },
        message: `Retrieved account **${account?.name || ctx.input.accountId}**`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.query) {
      params.q = ctx.input.query;
    }
    if (ctx.input.name) {
      params.name = ctx.input.name;
    }

    let result = await client.listCompanies(params, ctx.input.page);

    return {
      output: {
        accounts: result.records,
        totalCount: result.entityCount,
        nextPage: result.nextPage
      },
      message: `Found **${result.entityCount}** account(s)${result.nextPage !== null ? ` (more pages available, next: ${result.nextPage})` : ''}`
    };
  })
  .build();
