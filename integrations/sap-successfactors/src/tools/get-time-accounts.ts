import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTimeAccounts = SlateTool.create(spec, {
  name: 'Get Time Accounts',
  key: 'get_time_accounts',
  description: `Retrieve employee time account balances (leave balances) from SAP SuccessFactors. Shows available time-off balances by type, including vacation days, sick leave, and other configurable time account types.`,
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
      skip: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      timeAccounts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of time account records with balances'),
      totalCount: z.number().optional().describe('Total count of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    let filterParts: string[] = [];
    if (ctx.input.userId) {
      filterParts.push(`userId eq '${ctx.input.userId}'`);
    }
    if (ctx.input.filter) {
      filterParts.push(ctx.input.filter);
    }

    let result = await client.queryTimeAccounts({
      filter: filterParts.length > 0 ? filterParts.join(' and ') : undefined,
      select: ctx.input.select,
      top: ctx.input.top,
      skip: ctx.input.skip,
      inlineCount: true
    });

    return {
      output: {
        timeAccounts: result.results,
        totalCount: result.count
      },
      message: `Retrieved **${result.results.length}** time account records${ctx.input.userId ? ` for user ${ctx.input.userId}` : ''}`
    };
  })
  .build();
