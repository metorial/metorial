import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let recordPaymentReceived = SlateTool.create(spec, {
  name: 'Record Payment Received',
  key: 'record_payment_received',
  description: `Record a payment received from a client (cash receipt). Can be a client payment against invoices or general income (contract/rental). Supply invoice allocations with transactionType ip to update invoice balances.`,
  instructions: [
    'For client payments, use transactionType "ip" and provide the contactId of the client.',
    'For general income, use transactionType "icm" and specify an incomeType.'
  ]
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      transactionType: z
        .enum(['dp', 'icm', 'ip', 'cnp'])
        .describe(
          '"ip" for client payment, "dp" for other payments, "cnp" for supplier refund, "icm" for income.'
        ),
      contactId: z.string().describe('Contact ID of the client or payer.'),
      amount: z.string().describe('Payment amount (as string, e.g. "250.00").'),
      date: z.string().optional().describe('Payment date (YYYY-MM-DD). Defaults to today.'),
      title: z.string().optional().describe('Payment title or description.'),
      paymentMethod: z
        .string()
        .optional()
        .describe(
          'Payment method: "1"=domestic bank, "2"=foreign bank, "3"=cash, "4"=cheque, "6"=web banking, "7"=POS.'
        ),
      currencyCode: z.string().optional().describe('Currency code (e.g. "EUR").'),
      incomeType: z
        .enum(['contract', 'rental'])
        .optional()
        .describe('Income type, only for "icm" transaction type.'),
      draft: z.boolean().optional().describe('Payments cannot be drafted; true is rejected.'),
      invoicePayments: z
        .array(
          z.object({
            invoiceId: z.string().describe('Invoice ID to settle.'),
            amount: z.string().describe('Portion of this payment applied to the invoice.')
          })
        )
        .optional()
        .describe(
          'Invoice allocations for transactionType ip. Omit to leave the payment unallocated.'
        ),
      customId: z.string().optional().describe('Custom external identifier (API-only).')
    })
  )
  .output(
    z.object({
      cashReceipt: z.any().describe('The created cash receipt (payment received) object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.input.organizationId ?? ctx.config.organizationId
    });

    if (ctx.input.draft) {
      throw createApiServiceError('Elorus does not support draft cash receipts.', {
        reason: 'unsupported_payment_draft'
      });
    }
    if (ctx.input.invoicePayments?.length && ctx.input.transactionType !== 'ip') {
      throw createApiServiceError('Invoice allocations require transactionType ip.', {
        reason: 'invalid_payment_allocation'
      });
    }

    let body: any = {
      transaction_type: ctx.input.transactionType,
      contact: ctx.input.contactId,
      amount: ctx.input.amount
    };
    if (ctx.input.date) body.date = ctx.input.date;
    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.paymentMethod) body.payment_method = ctx.input.paymentMethod;
    if (ctx.input.currencyCode) body.currency_code = ctx.input.currencyCode;
    if (ctx.input.incomeType) body.income_type = ctx.input.incomeType;
    if (ctx.input.invoicePayments) {
      body.invoice_payments = ctx.input.invoicePayments.map(payment => ({
        invoice: payment.invoiceId,
        amount: payment.amount
      }));
    }
    if (ctx.input.customId) body.custom_id = ctx.input.customId;

    let receipt = await client.createCashReceipt(body);

    return {
      output: { cashReceipt: receipt },
      message: `Recorded payment received: **${receipt.amount} ${receipt.currency_code || ''}** (ID: ${receipt.id})`
    };
  })
  .build();
