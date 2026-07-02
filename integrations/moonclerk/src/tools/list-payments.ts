import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paymentSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listPaymentsTool = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Retrieve payment transactions with optional filters. Filter by form, customer, date range, or status to find specific payments. Returns payment amounts (in cents), payer info, custom fields, and coupon details.`,
  instructions: [
    'All amounts are in cents (e.g. 1000 = $10.00).',
    'Dates for filtering must be in YYYY-MM-DD format (UTC).',
    'By default returns 10 results. Use count (1-100) and offset for pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.number().optional().describe('Filter by MoonClerk form ID'),
      customerId: z.number().optional().describe('Filter by MoonClerk customer ID'),
      dateFrom: z.string().optional().describe('Start date filter (YYYY-MM-DD, UTC)'),
      dateTo: z.string().optional().describe('End date filter (YYYY-MM-DD, UTC)'),
      status: z
        .enum(['successful', 'refunded', 'failed'])
        .optional()
        .describe('Filter by payment status'),
      count: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results to return (1-100, default 10)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      payments: z.array(paymentSchema).describe('List of payment records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let payments = await client.listPayments({
      formId: ctx.input.formId,
      customerId: ctx.input.customerId,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      status: ctx.input.status,
      count: ctx.input.count,
      offset: ctx.input.offset
    });

    return {
      output: { payments },
      message: `Retrieved **${payments.length}** payment(s).`
    };
  })
  .build();
