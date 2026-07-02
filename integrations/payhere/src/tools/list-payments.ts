import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Retrieve a paginated list of payments, ordered chronologically with most recent first. Use **Get Payment** to fetch full details including customer and subscription data for a specific payment.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z
        .number()
        .optional()
        .describe('Number of records per page (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      payments: z.array(
        z.object({
          paymentId: z.number().describe('Payment identifier'),
          hashid: z.string().describe('Hash identifier'),
          reference: z.string().nullable().describe('Payment reference'),
          amount: z.number().describe('Payment amount'),
          formattedAmount: z.string().describe('Formatted amount with currency symbol'),
          currency: z.string().describe('Currency code'),
          refundAmount: z.number().describe('Amount refunded'),
          amountPaid: z.number().describe('Net amount paid'),
          cardBrand: z.string().nullable().describe('Card brand (e.g. Visa, Mastercard)'),
          cardLast4: z.string().nullable().describe('Last 4 digits of the card'),
          status: z.string().describe('Payment status'),
          success: z.boolean().describe('Whether payment was successful'),
          createdAt: z.string().describe('Payment timestamp'),
          updatedAt: z.string()
        })
      ),
      meta: z.object({
        currentPage: z.number(),
        nextPage: z.number().nullable(),
        prevPage: z.number().nullable(),
        totalPages: z.number(),
        totalCount: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayhereClient({ token: ctx.auth.token });

    let result = await client.listPayments({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: result,
      message: `Found **${result.payments.length}** payments (page ${result.meta.currentPage} of ${result.meta.totalPages}, ${result.meta.totalCount} total).`
    };
  })
  .build();
