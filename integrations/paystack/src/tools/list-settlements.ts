import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';

import {
  exactId,
  optionalNumericId,
  pagination,
  records,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const listSettlementsOutput = z.object({
  settlements: z.array(
    z.object({
      settlementId: z.number().optional().describe('Settlement ID'),
      exactSettlementId: z
        .string()
        .describe(
          'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
        ),
      totalAmount: z.number().describe('Total settlement amount'),
      currency: z.string().describe('Currency'),
      status: z.string().describe('Settlement status'),
      settledAt: z.string().nullable().describe('Settlement date')
    })
  ),
  totalCount: z.number().optional().describe('Total settlements'),
  currentPage: z.number().optional().describe('Current page'),
  totalPages: z.number().optional().describe('Total pages'),
  nextCursor: z.string().nullable().optional().describe('Provider next cursor, when returned'),
  previousCursor: z
    .string()
    .nullable()
    .optional()
    .describe('Provider previous cursor, when returned'),
  perPage: z.number().optional().describe('Observed provider page size')
});

export let listSettlements = SlateTool.create(spec, {
  name: 'List Settlements',
  key: 'list_settlements',
  description: `Retrieve a paginated list of settlements (payouts) made by Paystack to your bank account. Provides insight into when funds were settled and for how much.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Records per page'),
      page: z.number().optional().describe('Page number'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)'),
      subaccount: z.string().optional().describe('Filter by subaccount code')
    })
  )
  .output(listSettlementsOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listSettlements(ctx.input);
    const output = {
      settlements: records(result.data).map(item => ({
        settlementId: optionalNumericId(item.id),
        exactSettlementId: exactId(item.id),
        totalAmount: item.total_amount,
        currency: item.currency,
        status: item.status,
        settledAt: item.settlement_date ?? null
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listSettlementsOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
