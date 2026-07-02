import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Lists payments within a date range. Can filter by resource and payment method. Returns payment details including amount, status, customer info, and associated reservation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start of date range (e.g. "2024-06-01")'),
      endDate: z.string().describe('End of date range (e.g. "2024-06-30")'),
      resourceId: z.string().optional().describe('Filter by resource ID'),
      paymentModeFilter: z.number().optional().describe('Filter by payment method code'),
      statusFilter: z
        .number()
        .optional()
        .describe('Filter by status (1=paid, 2=pending, 3=errors, 4=refunds)')
    })
  )
  .output(
    z.object({
      payments: z
        .array(
          z.object({
            paymentId: z.string().describe('Payment ID'),
            reservationId: z.string().optional().describe('Associated reservation ID'),
            resourceId: z.string().optional().describe('Resource ID'),
            userId: z.string().optional().describe('Customer user ID'),
            email: z.string().optional().describe('Customer email'),
            firstName: z.string().optional().describe('Customer first name'),
            lastName: z.string().optional().describe('Customer last name'),
            amount: z.number().optional().describe('Payment amount'),
            currency: z.string().optional().describe('Currency code'),
            paymentDate: z.string().optional().describe('Payment date'),
            paymentMode: z.string().optional().describe('Payment method name'),
            status: z.string().optional().describe('Payment status'),
            statusCode: z.number().optional().describe('Payment status code'),
            comment: z.string().optional().describe('Payment comment')
          })
        )
        .describe('List of payments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.listPayments({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      resourceId: ctx.input.resourceId,
      paymentModeIdFilter: ctx.input.paymentModeFilter,
      status: ctx.input.statusFilter
    });

    let results = result?.results || result || [];
    let payments = (Array.isArray(results) ? results : []).map((p: any) => ({
      paymentId: String(p.payment_id),
      reservationId: p.reservation_id ? String(p.reservation_id) : undefined,
      resourceId: p.resource_id ? String(p.resource_id) : undefined,
      userId: p.user_id ? String(p.user_id) : undefined,
      email: p.email,
      firstName: p.first_name,
      lastName: p.last_name,
      amount: p.payment_amount != null ? Number(p.payment_amount) : undefined,
      currency: p.payment_currency,
      paymentDate: p.payment_date,
      paymentMode: p.payment_mode,
      status: p.status,
      statusCode: p.status_code != null ? Number(p.status_code) : undefined,
      comment: p.payment_comment
    }));

    return {
      output: {
        payments
      },
      message: `Found **${payments.length}** payment(s) from ${ctx.input.startDate} to ${ctx.input.endDate}.`
    };
  })
  .build();
