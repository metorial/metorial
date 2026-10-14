import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let bookInvoice = SlateTool.create(spec, {
  name: 'Book Invoice Payment',
  key: 'book_invoice',
  description: `Record a payment on an invoice. Supports full and partial payments. The payment is booked against a check account (bank account) in sevDesk.`,
  instructions: [
    'Use the List Check Accounts tool to find the correct checkAccountId for the bank account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to book payment on'),
      amount: z.number().describe('Payment amount'),
      date: z.string().describe('Payment date in YYYY-MM-DD format'),
      type: z
        .enum(['N', 'CB', 'CF', 'O', 'OF', 'C', 'FULL_PAYMENT', 'MTC'])
        .describe(
          'Payment type: FULL_PAYMENT=full payment, N=partial payment, CB=discount, CF=currency difference (deprecated), O=other difference, OF=reminder charges, MTC=transaction costs. C is a legacy unsupported value.'
        ),
      checkAccountId: z
        .string()
        .describe(
          'ID of the check account (bank account) to book against. Use list_check_accounts to discover accounts.'
        ),
      checkAccountTransactionId: z
        .string()
        .optional()
        .describe(
          'Existing bank transaction ID. Required for online check accounts; omit for other account types.'
        )
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('ID of the booked invoice'),
      amountBooked: z.number().describe('Amount booked'),
      booked: z.boolean().describe('Whether the payment was successfully booked')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.type === 'C') {
      throw createApiServiceError(
        'Payment type C is not supported by sevDesk. Use a documented payment type such as FULL_PAYMENT or N.'
      );
    }
    let client = new SevdeskClient({ token: ctx.auth.token });

    await client.bookInvoice(ctx.input.invoiceId, {
      amount: ctx.input.amount,
      date: ctx.input.date,
      type: ctx.input.type,
      checkAccount: { id: ctx.input.checkAccountId, objectName: 'CheckAccount' },
      checkAccountTransaction: ctx.input.checkAccountTransactionId
        ? { id: ctx.input.checkAccountTransactionId, objectName: 'CheckAccountTransaction' }
        : undefined
    });

    return {
      output: {
        invoiceId: ctx.input.invoiceId,
        amountBooked: ctx.input.amount,
        booked: true
      },
      message: `Booked payment of **${ctx.input.amount}** on invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
