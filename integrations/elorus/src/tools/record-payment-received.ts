import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recordPaymentReceived = SlateTool.create(spec, {
  name: 'Record Payment Received',
  key: 'record_payment_received',
  description: `Record a payment received from a client (cash receipt). Can be a client payment against invoices or general income (contract/rental). Records the payment and updates invoice balances automatically.`,
  instructions: [
    'For client payments, use transactionType "dp" and provide the contactId of the client.',
    'For general income, use transactionType "icm" and specify an incomeType.'
  ]
})
  .input(
    z.object({
      transactionType: z
        .enum(['dp', 'icm'])
        .describe('"dp" for client payment (against invoices), "icm" for general income.'),
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
      draft: z.boolean().optional().describe('Create as draft (true) or finalize (false).'),
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
      organizationId: ctx.config.organizationId
    });

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
    if (ctx.input.draft !== undefined) body.draft = ctx.input.draft;
    if (ctx.input.customId) body.custom_id = ctx.input.customId;

    let receipt = await client.createCashReceipt(body);

    return {
      output: { cashReceipt: receipt },
      message: `Recorded payment received: **${receipt.amount} ${receipt.currency_code || ''}** (ID: ${receipt.id})`
    };
  })
  .build();
