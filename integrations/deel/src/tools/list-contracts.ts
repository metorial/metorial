import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let listContracts = SlateTool.create(spec, {
  name: 'List Contracts',
  key: 'list_contracts',
  description: `Retrieve a list of contracts from Deel. Supports filtering by status, contract type, and other parameters. Returns contract details including worker info, compensation, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      statuses: z
        .array(z.string())
        .optional()
        .describe('Filter by contract statuses (e.g. "in_progress", "signed", "terminated")'),
      contractTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by contract types (e.g. "ongoing_time_based", "pay_as_you_go_time_based", "payg_milestones")'
        ),
      limit: z.number().optional().describe('Number of results to return (default 20)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      contracts: z.array(z.record(z.string(), z.any())).describe('List of contract objects'),
      total: z.number().optional().describe('Total number of contracts matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let params: Record<string, any> = {};
    if (ctx.input.statuses) params['statuses[]'] = ctx.input.statuses;
    if (ctx.input.contractTypes) params['types[]'] = ctx.input.contractTypes;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listContracts(params);

    let contracts = result?.data ?? [];
    let total = result?.page?.total_rows;

    return {
      output: { contracts, total },
      message: `Found ${contracts.length} contract(s)${total !== undefined ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
