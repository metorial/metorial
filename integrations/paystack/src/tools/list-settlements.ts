import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
      settlements: z.array(
        z.object({
          settlementId: z.number().describe('Settlement ID'),
          totalAmount: z.number().describe('Total settlement amount'),
          currency: z.string().describe('Currency'),
          status: z.string().describe('Settlement status'),
          settledAt: z.string().nullable().describe('Settlement date')
        })
      ),
      totalCount: z.number().describe('Total settlements'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listSettlements({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      from: ctx.input.from,
      to: ctx.input.to,
      subaccount: ctx.input.subaccount
    });

    let settlements = (result.data ?? []).map((s: any) => ({
      settlementId: s.id,
      totalAmount: s.total_amount ?? s.amount ?? 0,
      currency: s.currency ?? '',
      status: s.status ?? '',
      settledAt: s.settled_date ?? s.settled_at ?? null
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        settlements,
        totalCount: meta.total ?? 0,
        currentPage: meta.page ?? 1,
        totalPages: meta.pageCount ?? 1
      },
      message: `Found **${meta.total ?? settlements.length}** settlements.`
    };
  })
  .build();
