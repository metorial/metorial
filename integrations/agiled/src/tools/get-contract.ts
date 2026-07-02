import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContract = SlateTool.create(spec, {
  name: 'Get Contract',
  key: 'get_contract',
  description: `Retrieve a contract by ID, or list contracts with pagination. Returns contract details including subject, value, client, and dates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      contractId: z
        .string()
        .optional()
        .describe('ID of a specific contract to retrieve. If omitted, lists contracts.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of contracts per page')
    })
  )
  .output(
    z.object({
      contracts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of contract records'),
      totalCount: z.number().optional().describe('Total number of contracts'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.contractId) {
      let result = await client.getContract(ctx.input.contractId);
      return {
        output: { contracts: [result.data] },
        message: `Retrieved contract **${result.data.subject ?? ctx.input.contractId}**.`
      };
    }

    let result = await client.listContracts(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        contracts: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} contract(s)${result.meta ? ` (page ${result.meta.current_page} of ${result.meta.last_page})` : ''}.`
    };
  })
  .build();
