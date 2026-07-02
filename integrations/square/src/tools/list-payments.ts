import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let moneySchema = z
  .object({
    amount: z
      .number()
      .optional()
      .describe('Amount in the smallest denomination of the currency (e.g., cents)'),
    currency: z.string().optional().describe('Currency code, e.g., USD')
  })
  .optional();

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Retrieve a list of payments taken by the Square account. Supports filtering by time range, location, and pagination. Returns payment details including amounts, status, and source type.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beginTime: z.string().optional().describe('Start of time range in RFC 3339 format'),
      endTime: z.string().optional().describe('End of time range in RFC 3339 format'),
      sortOrder: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Sort order by created_at. Defaults to DESC'),
      locationId: z.string().optional().describe('Filter payments by location ID'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      payments: z.array(
        z.object({
          paymentId: z.string().optional(),
          status: z.string().optional(),
          amountMoney: moneySchema,
          tipMoney: moneySchema,
          totalMoney: moneySchema,
          sourceType: z.string().optional(),
          locationId: z.string().optional(),
          orderId: z.string().optional(),
          customerId: z.string().optional(),
          referenceId: z.string().optional(),
          note: z.string().optional(),
          receiptUrl: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      cursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listPayments({
      beginTime: ctx.input.beginTime,
      endTime: ctx.input.endTime,
      sortOrder: ctx.input.sortOrder,
      cursor: ctx.input.cursor,
      locationId: ctx.input.locationId,
      limit: ctx.input.limit
    });

    let payments = result.payments.map(p => ({
      paymentId: p.id,
      status: p.status,
      amountMoney: p.amount_money,
      tipMoney: p.tip_money,
      totalMoney: p.total_money,
      sourceType: p.source_type,
      locationId: p.location_id,
      orderId: p.order_id,
      customerId: p.customer_id,
      referenceId: p.reference_id,
      note: p.note,
      receiptUrl: p.receipt_url,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    return {
      output: { payments, cursor: result.cursor },
      message: `Found **${payments.length}** payment(s).${result.cursor ? ' More results available with cursor.' : ''}`
    };
  })
  .build();
