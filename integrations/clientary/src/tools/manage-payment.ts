import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paymentSchema = z.object({
  paymentId: z.number().describe('Unique ID of the payment'),
  invoiceId: z.number().optional().describe('Associated invoice ID'),
  amount: z.number().describe('Payment amount'),
  note: z.string().optional().describe('Payment note'),
  receivedOn: z.string().optional().describe('Date payment was received (YYYY-MM-DD)'),
  transactionId: z.string().optional().describe('Gateway transaction ID (e.g. from Stripe)'),
  transactionFee: z.number().optional().describe('Transaction fee charged by gateway'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let createPayment = SlateTool.create(spec, {
  name: 'Create Payment',
  key: 'create_payment',
  description: `Apply a payment to an invoice. Provide an amount and optional note, or use a stored payment profile to automatically charge the full outstanding balance.`,
  instructions: [
    'When using paymentProfileId, the amount and note fields are ignored — the full invoice balance is charged automatically.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice to apply payment to'),
      amount: z
        .number()
        .optional()
        .describe('Payment amount. Required unless using paymentProfileId.'),
      note: z.string().optional().describe('Payment note'),
      paymentProfileId: z
        .number()
        .optional()
        .describe(
          'Payment profile ID to charge. Overrides amount/note and bills the full balance.'
        )
    })
  )
  .output(paymentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let result = await client.createPayment(ctx.input.invoiceId, {
      amount: ctx.input.amount,
      note: ctx.input.note,
      paymentProfileId: ctx.input.paymentProfileId
    });

    let p = result.payment || result;

    return {
      output: mapPayment(p),
      message: `Applied payment of **${p.amount}** to invoice ID ${ctx.input.invoiceId}.`
    };
  })
  .build();

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `List all payments with pagination. Sorted by received date by default. Use \`sort: "created_at"\` to sort by creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (30 results per page)'),
      sort: z
        .enum(['received_on', 'created_at'])
        .optional()
        .describe('Sort field. Default: received_on')
    })
  )
  .output(
    z.object({
      payments: z.array(paymentSchema).describe('List of payments'),
      totalCount: z.number().optional().describe('Total number of payments'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let result = await client.listPayments({
      page: ctx.input.page,
      sort: ctx.input.sort
    });

    let payments = (result.payments || []).map(mapPayment);

    return {
      output: {
        payments,
        totalCount: result.total_count,
        pageCount: result.page_count
      },
      message: `Retrieved ${payments.length} payment(s).`
    };
  })
  .build();

export let deletePayment = SlateTool.create(spec, {
  name: 'Delete Payment',
  key: 'delete_payment',
  description: `Permanently remove a payment from an invoice.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice the payment is applied to'),
      paymentId: z.number().describe('ID of the payment to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deletePayment(ctx.input.invoiceId, ctx.input.paymentId);

    return {
      output: { success: true },
      message: `Removed payment ID ${ctx.input.paymentId} from invoice ID ${ctx.input.invoiceId}.`
    };
  })
  .build();

let mapPayment = (p: any) => ({
  paymentId: p.id,
  invoiceId: p.invoice_id,
  amount: p.amount,
  note: p.note,
  receivedOn: p.received_on,
  transactionId: p.transaction_id,
  transactionFee: p.transaction_fee,
  createdAt: p.created_at
});
