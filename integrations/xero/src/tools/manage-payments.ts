import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let paymentOutputSchema = z.object({
  paymentId: z.string().optional().describe('Unique Xero payment ID'),
  date: z.string().optional().describe('Payment date'),
  amount: z.number().optional().describe('Payment amount'),
  reference: z.string().optional().describe('Payment reference'),
  isReconciled: z.boolean().optional().describe('Whether the payment is reconciled'),
  status: z.string().optional().describe('Payment status'),
  paymentType: z.string().optional().describe('Payment type'),
  accountCode: z.string().optional().describe('Account code'),
  accountId: z.string().optional().describe('Account ID'),
  invoiceId: z.string().optional().describe('Related invoice ID'),
  invoiceNumber: z.string().optional().describe('Related invoice number'),
  creditNoteId: z.string().optional().describe('Related credit note ID'),
  bankAmount: z.number().optional().describe('Bank amount'),
  currencyRate: z.number().optional().describe('Currency exchange rate'),
  updatedDate: z.string().optional().describe('Last updated timestamp')
});

let mapPayment = (p: any) => ({
  paymentId: p.PaymentID,
  date: p.Date,
  amount: p.Amount,
  reference: p.Reference,
  isReconciled: p.IsReconciled,
  status: p.Status,
  paymentType: p.PaymentType,
  accountCode: p.Account?.Code,
  accountId: p.Account?.AccountID,
  invoiceId: p.Invoice?.InvoiceID,
  invoiceNumber: p.Invoice?.InvoiceNumber,
  creditNoteId: p.CreditNote?.CreditNoteID,
  bankAmount: p.BankAmount,
  currencyRate: p.CurrencyRate,
  updatedDate: p.UpdatedDateUTC
});

export let createPayment = SlateTool.create(spec, {
  name: 'Create Payment',
  key: 'create_payment',
  description: `Records a payment against an invoice or credit note in Xero. Specify the invoice, account (bank account), amount, and date. Partial payments are supported.`,
  instructions: [
    'Provide either invoiceId or creditNoteId to link the payment',
    'The accountCode should be a bank account code in your chart of accounts'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      invoiceId: z
        .string()
        .optional()
        .describe('Invoice ID to pay (use either this or creditNoteId)'),
      creditNoteId: z
        .string()
        .optional()
        .describe('Credit note ID to pay (use either this or invoiceId)'),
      accountCode: z.string().describe('Bank account code to pay from/to'),
      amount: z.number().describe('Payment amount'),
      date: z.string().optional().describe('Payment date (YYYY-MM-DD). Defaults to today'),
      reference: z.string().optional().describe('Payment reference'),
      currencyRate: z
        .number()
        .optional()
        .describe('Currency exchange rate for multi-currency payments')
    })
  )
  .output(paymentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let paymentData: Record<string, any> = {
      Account: { Code: ctx.input.accountCode },
      Amount: ctx.input.amount
    };

    if (ctx.input.invoiceId) paymentData.Invoice = { InvoiceID: ctx.input.invoiceId };
    if (ctx.input.creditNoteId)
      paymentData.CreditNote = { CreditNoteID: ctx.input.creditNoteId };
    if (ctx.input.date) paymentData.Date = ctx.input.date;
    if (ctx.input.reference) paymentData.Reference = ctx.input.reference;
    if (ctx.input.currencyRate) paymentData.CurrencyRate = ctx.input.currencyRate;

    let payment = await client.createPayment(paymentData);
    let output = mapPayment(payment);

    return {
      output,
      message: `Recorded payment of **${output.amount?.toFixed(2)}** against ${output.invoiceNumber ? `invoice **${output.invoiceNumber}**` : `credit note **${output.creditNoteId}**`}.`
    };
  })
  .build();

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Lists payments recorded in Xero. Filter by modification date or use a where filter to narrow results. Useful for reconciliation and payment tracking.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starting from 1)'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return payments modified after this date (ISO 8601)'),
      where: z
        .string()
        .optional()
        .describe('Xero API where filter expression, e.g. `Status=="AUTHORISED"`'),
      order: z.string().optional().describe('Order results, e.g. "Date DESC"')
    })
  )
  .output(
    z.object({
      payments: z.array(paymentOutputSchema).describe('List of payments'),
      count: z.number().describe('Number of payments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.getPayments({
      page: ctx.input.page,
      modifiedAfter: ctx.input.modifiedAfter,
      where: ctx.input.where,
      order: ctx.input.order
    });

    let payments = (result.Payments || []).map(mapPayment);

    return {
      output: { payments, count: payments.length },
      message: `Found **${payments.length}** payment(s).`
    };
  })
  .build();

export let deletePayment = SlateTool.create(spec, {
  name: 'Delete Payment',
  key: 'delete_payment',
  description: `Deletes (removes) a payment from Xero. The associated invoice will have its payment status recalculated. Only non-reconciled payments can be deleted.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      paymentId: z.string().describe('The Xero payment ID to delete')
    })
  )
  .output(paymentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let payment = await client.deletePayment(ctx.input.paymentId);
    let output = mapPayment(payment);

    return {
      output,
      message: `Deleted payment **${output.paymentId}**.`
    };
  })
  .build();
