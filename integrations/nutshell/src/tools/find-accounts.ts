import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let findAccounts = SlateTool.create(spec, {
  name: 'Find Accounts',
  key: 'find_accounts',
  description: `Search and list accounts (companies) in Nutshell CRM. Supports pagination, sorting, and filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.record(z.string(), z.any()).optional().describe('Filter criteria for accounts'),
      orderBy: z.string().optional().describe('Field to sort by (default: "name")'),
      orderDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      stubResponses: z
        .boolean()
        .optional()
        .describe('Return lightweight stub responses for faster performance')
    })
  )
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            accountId: z.number().describe('ID of the account'),
            name: z.string().describe('Account name'),
            urls: z.array(z.any()).optional().describe('Website URLs'),
            phones: z.array(z.any()).optional().describe('Phone numbers'),
            entityType: z.string().optional().describe('Entity type')
          })
        )
        .describe('List of accounts matching the criteria'),
      count: z.number().describe('Number of accounts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let results = await client.findAccounts({
      query: ctx.input.query,
      orderBy: ctx.input.orderBy,
      orderDirection: ctx.input.orderDirection,
      limit: ctx.input.limit,
      page: ctx.input.page,
      stubResponses: ctx.input.stubResponses
    });

    let accounts = results.map((a: any) => ({
      accountId: a.id,
      name: a.name,
      urls: a.url || a.urls,
      phones: a.phone || a.phones,
      entityType: a.entityType
    }));

    return {
      output: {
        accounts,
        count: accounts.length
      },
      message: `Found **${accounts.length}** account(s).`
    };
  })
  .build();
