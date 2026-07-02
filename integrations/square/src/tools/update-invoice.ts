import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';
import { invoiceSummaryOutputSchema, mapInvoiceSummary } from './shared';

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description:
    'Update a Square invoice using sparse invoice fields and the current invoice version. Some fields, including order_id and location_id, cannot be changed by Square.',
  tags: { destructive: false }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The ID of the invoice to update'),
      version: z.number().describe('Current invoice version for optimistic concurrency'),
      title: z.string().optional().describe('Updated invoice title'),
      description: z.string().optional().describe('Updated invoice description'),
      paymentRequests: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Replacement or sparse payment request updates'),
      deliveryMethod: z.enum(['EMAIL', 'SHARE_MANUALLY']).optional(),
      scheduledAt: z
        .string()
        .optional()
        .describe('RFC 3339 timestamp for when to send the invoice'),
      acceptedPaymentMethods: z
        .object({
          card: z.boolean().optional(),
          squareGiftCard: z.boolean().optional(),
          bankAccount: z.boolean().optional(),
          buyNowPayLater: z.boolean().optional(),
          cashAppPay: z.boolean().optional()
        })
        .optional()
        .describe('Payment methods accepted for this invoice'),
      saleOrServiceDate: z
        .string()
        .optional()
        .describe('Date of sale or service in YYYY-MM-DD format'),
      fieldsToClear: z.array(z.string()).optional().describe('Invoice fields to clear'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate updates. Auto-generated if omitted')
    })
  )
  .output(invoiceSummaryOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let invoice: Record<string, any> = {
      version: ctx.input.version,
      title: ctx.input.title,
      description: ctx.input.description,
      payment_requests: ctx.input.paymentRequests,
      delivery_method: ctx.input.deliveryMethod,
      scheduled_at: ctx.input.scheduledAt,
      sale_or_service_date: ctx.input.saleOrServiceDate
    };

    if (ctx.input.acceptedPaymentMethods) {
      invoice.accepted_payment_methods = {
        card: ctx.input.acceptedPaymentMethods.card,
        square_gift_card: ctx.input.acceptedPaymentMethods.squareGiftCard,
        bank_account: ctx.input.acceptedPaymentMethods.bankAccount,
        buy_now_pay_later: ctx.input.acceptedPaymentMethods.buyNowPayLater,
        cash_app_pay: ctx.input.acceptedPaymentMethods.cashAppPay
      };
    }

    let updated = await client.updateInvoice(ctx.input.invoiceId, {
      invoice,
      fieldsToClear: ctx.input.fieldsToClear,
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey()
    });
    let output = mapInvoiceSummary(updated);

    return {
      output,
      message: `Invoice **${output.invoiceId}** updated. Status: **${output.status}**`
    };
  })
  .build();
