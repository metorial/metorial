import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { userFilter } from '../lib/helpers';
import { spec } from '../spec';

export let getTimeAccounts = SlateTool.create(spec, {
  name: 'Get Time Accounts',
  key: 'get_time_accounts',
  description: `Query the legacy EmployeeTimeAccount entity when the company exposes it. Returned fields depend on runtime metadata; calculated leave balances are not guaranteed. If unavailable, inspect get_api_metadata and use query_odata_entity for an explicitly selected documented entity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Filter by specific employee user ID'),
      filter: z
        .string()
        .optional()
        .describe('OData $filter expression for advanced filtering'),
      select: z.string().optional().describe('Comma-separated fields to return'),
      top: z.number().optional().describe('Maximum records to return').default(100),
      nextPage: z
        .string()
        .optional()
        .describe(
          'Exact nextLink from the preceding result. Keep the entity and original query unchanged; do not combine with skip.'
        ),
      skip: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      timeAccounts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of authorized time account records'),
      nextLink: z
        .string()
        .optional()
        .describe(
          'Exact provider continuation URL; pass it as nextPage to retrieve the next page.'
        ),
      hasMore: z.boolean().optional().describe('Whether SAP returned another page.'),
      totalCount: z.number().optional().describe('Total count of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    let result = await client.queryTimeAccounts({
      filter: userFilter(ctx.input.userId, ctx.input.filter),
      select: ctx.input.select,
      top: ctx.input.top,
      skip: ctx.input.skip,
      nextPage: ctx.input.nextPage,
      inlineCount: true
    });

    return {
      output: {
        timeAccounts: result.results,
        totalCount: result.count,
        nextLink: result.nextLink,
        hasMore: result.hasMore
      },
      message: `Retrieved **${result.results.length}** time account records`
    };
  })
  .build();
