import { anyOf, SlateTool } from 'slates';
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

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve billing invoices from Deel for accounting and financial integration. Returns invoice details including amounts, dates, and statuses.`,
  tags: {
    readOnly: true
  }
})
  .scopes(anyOf('accounting:read'))
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      cursor: z.string().optional().describe('Cursor from a previous invoice page'),
      status: z
        .enum(['all'])
        .optional()
        .describe(
          'Set all to include unpaid invoices; otherwise the provider returns paid invoices'
        )
    })
  )
  .output(
    z.object({
      invoices: z.array(resourceSchema).describe('List of invoices'),
      page: pageSchema.optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateLimit(ctx.input.limit, 50);
    validateOffset(ctx.input.offset);
    let client = createClient(ctx);

    let params: DeelParameters = {};
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;
    if (ctx.input.offset !== undefined) params.offset = ctx.input.offset;

    if (ctx.input.cursor !== undefined) params.cursor = ctx.input.cursor;
    if (ctx.input.status !== undefined) params.status = ctx.input.status;
    let result = await client.listInvoices(params);
    let invoices = dataList(result, 'invoices');
    let page = responsePage(result);

    return {
      output: { invoices, page, nextCursor: page?.cursor },
      message: `Found ${invoices.length} invoice(s).`
    };
  })
  .build();
