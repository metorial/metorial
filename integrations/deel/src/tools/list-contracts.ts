import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import type { DeelParameters } from '../lib/client';
import {
  dataList,
  pageSchema,
  resourceSchema,
  responsePage,
  validateLimit,
  validateOffset
} from '../lib/response';
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
  .scopes(anyOf('contracts:read'))
  .input(
    z.object({
      statuses: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by contract statuses (e.g. "in_progress", "waiting_for_client_sign", "completed")'
        ),
      contractTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by contract types (e.g. "ongoing_time_based", "pay_as_you_go_time_based", "payg_milestones")'
        ),
      limit: z.number().optional().describe('Number of results, 1–150 (provider default 50)'),
      offset: z
        .number()
        .optional()
        .describe('Legacy first-page offset; use afterCursor for later pages'),
      afterCursor: z
        .string()
        .optional()
        .describe('Cursor returned as nextCursor by the previous call'),
      search: z.string().optional().describe('Worker or contract name search')
    })
  )
  .output(
    z.object({
      contracts: z.array(resourceSchema).describe('List of contract objects'),
      total: z.number().optional().describe('Total number of contracts matching the filter'),
      page: pageSchema.optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateLimit(ctx.input.limit, 150);
    validateOffset(ctx.input.offset);
    if (ctx.input.offset !== undefined && ctx.input.offset !== 0)
      throw createApiServiceError(
        'Contract listing uses cursor pagination. Use nextCursor from the previous result as afterCursor.'
      );
    let client = createClient(ctx);

    let params: DeelParameters = {};
    if (ctx.input.statuses) params.statuses = ctx.input.statuses;
    if (ctx.input.contractTypes) params.types = ctx.input.contractTypes;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;
    if (ctx.input.afterCursor !== undefined) params.after_cursor = ctx.input.afterCursor;
    if (ctx.input.search !== undefined) params.search = ctx.input.search;

    let result = await client.listContracts(params);

    let contracts = dataList(result, 'contracts');
    let page = responsePage(result);
    let total = page?.total_rows;

    return {
      output: { contracts, total, page, nextCursor: page?.cursor },
      message: `Found ${contracts.length} contract(s)${total !== undefined ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
