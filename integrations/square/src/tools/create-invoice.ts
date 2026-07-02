import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new draft invoice for an existing order. The invoice must be published separately before it can be sent to the customer.`,
  instructions: [
    'An order must be created first using the Create Order tool.',
    'After creating, use the Manage Invoice tool to publish the invoice.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      locationId: z.string().describe('Location ID for the invoice'),
      orderId: z.string().describe('Order ID the invoice is based on'),
      primaryRecipientCustomerId: z
        .string()
        .optional()
        .describe('Customer ID of the primary recipient'),
      paymentRequests: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Payment request configurations with due dates and amounts'),
      deliveryMethod: z
        .enum(['EMAIL', 'SHARE_MANUALLY', 'SMS'])
        .optional()
        .describe('How the invoice is delivered to the customer'),
      invoiceNumber: z.string().optional().describe('Custom invoice number'),
      title: z.string().optional().describe('Invoice title'),
      description: z.string().optional().describe('Invoice description'),
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
      idempotencyKey: z.string().optional()
    })
  )
  .output(
    z.object({
      invoiceId: z.string().optional(),
      invoiceNumber: z.string().optional(),
      status: z.string().optional(),
      version: z.number().optional(),
      orderId: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let invoice: Record<string, any> = {
      location_id: ctx.input.locationId,
      order_id: ctx.input.orderId,
      delivery_method: ctx.input.deliveryMethod,
      invoice_number: ctx.input.invoiceNumber,
      title: ctx.input.title,
      description: ctx.input.description,
      scheduled_at: ctx.input.scheduledAt,
      sale_or_service_date: ctx.input.saleOrServiceDate
    };

    if (ctx.input.primaryRecipientCustomerId) {
      invoice.primary_recipient = { customer_id: ctx.input.primaryRecipientCustomerId };
    }
    if (ctx.input.paymentRequests) {
      invoice.payment_requests = ctx.input.paymentRequests;
    }
    if (ctx.input.acceptedPaymentMethods) {
      invoice.accepted_payment_methods = {
        card: ctx.input.acceptedPaymentMethods.card,
        square_gift_card: ctx.input.acceptedPaymentMethods.squareGiftCard,
        bank_account: ctx.input.acceptedPaymentMethods.bankAccount,
        buy_now_pay_later: ctx.input.acceptedPaymentMethods.buyNowPayLater,
        cash_app_pay: ctx.input.acceptedPaymentMethods.cashAppPay
      };
    }

    let i = await client.createInvoice({
      invoice,
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey()
    });

    return {
      output: {
        invoiceId: i.id,
        invoiceNumber: i.invoice_number,
        status: i.status,
        version: i.version,
        orderId: i.order_id,
        createdAt: i.created_at
      },
      message: `Invoice **${i.id}** created in **${i.status}** status.`
    };
  })
  .build();
