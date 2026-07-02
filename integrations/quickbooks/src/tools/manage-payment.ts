import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { quickBooksServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let linkedInvoiceSchema = z.object({
  invoiceId: z.string().describe('Invoice ID to apply payment to'),
  amount: z
    .number()
    .optional()
    .describe('Amount to apply to this invoice (defaults to full amount)')
});

export let createPayment = SlateTool.create(spec, {
  name: 'Create Payment',
  key: 'create_payment',
  description: `Records a payment received from a customer. The payment can be linked to one or more invoices, or recorded as an unlinked payment (credit). Supports specifying the payment method and deposit account.`,
  instructions: [
    'Link payments to specific invoices using the linkedInvoices field for accurate tracking.',
    'If no linkedInvoices are provided, the payment is recorded as unapplied credit.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('QuickBooks Customer ID making the payment'),
      totalAmount: z.number().describe('Total payment amount'),
      linkedInvoices: z
        .array(linkedInvoiceSchema)
        .optional()
        .describe('Invoices to apply the payment against'),
      txnDate: z.string().optional().describe('Payment date (YYYY-MM-DD), defaults to today'),
      paymentMethodId: z
        .string()
        .optional()
        .describe('Payment method reference ID (cash, check, credit card, etc.)'),
      depositAccountId: z
        .string()
        .optional()
        .describe('Account ID to deposit the payment into'),
      referenceNumber: z.string().optional().describe('Reference number (e.g., check number)'),
      privateNote: z.string().optional().describe('Internal memo for the payment')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('Payment ID'),
      totalAmount: z.number().describe('Total payment amount'),
      unappliedAmount: z.number().optional().describe('Amount not applied to any invoice'),
      txnDate: z.string().optional().describe('Payment date'),
      syncToken: z.string().describe('Sync token for updates')
    })
  )
  .handleInvocation(async ctx => {
    let paymentData: any = {
      CustomerRef: { value: ctx.input.customerId },
      TotalAmt: ctx.input.totalAmount
    };

    if (ctx.input.txnDate) paymentData.TxnDate = ctx.input.txnDate;
    if (ctx.input.paymentMethodId)
      paymentData.PaymentMethodRef = { value: ctx.input.paymentMethodId };
    if (ctx.input.depositAccountId)
      paymentData.DepositToAccountRef = { value: ctx.input.depositAccountId };
    if (ctx.input.referenceNumber) paymentData.PaymentRefNum = ctx.input.referenceNumber;
    if (ctx.input.privateNote) paymentData.PrivateNote = ctx.input.privateNote;

    if (ctx.input.linkedInvoices && ctx.input.linkedInvoices.length > 0) {
      let hasMissingLineAmount = ctx.input.linkedInvoices.some(
        inv => inv.amount === undefined
      );
      if (ctx.input.linkedInvoices.length > 1 && hasMissingLineAmount) {
        throw quickBooksServiceError(
          'Payments linked to multiple invoices require an amount for each invoice.'
        );
      }

      let appliedAmount = ctx.input.linkedInvoices.reduce(
        (sum, inv) => sum + (inv.amount ?? ctx.input.totalAmount),
        0
      );
      if (Math.round(appliedAmount * 100) !== Math.round(ctx.input.totalAmount * 100)) {
        throw quickBooksServiceError(
          `Linked invoice amounts (${appliedAmount}) must equal totalAmount (${ctx.input.totalAmount}).`
        );
      }

      paymentData.Line = ctx.input.linkedInvoices.map(inv => ({
        Amount: inv.amount ?? ctx.input.totalAmount,
        LinkedTxn: [
          {
            TxnId: inv.invoiceId,
            TxnType: 'Invoice'
          }
        ]
      }));
    }

    let client = createClientFromContext(ctx);
    let payment = await client.createPayment(paymentData);

    return {
      output: {
        paymentId: payment.Id,
        totalAmount: payment.TotalAmt,
        unappliedAmount: payment.UnappliedAmt,
        txnDate: payment.TxnDate,
        syncToken: payment.SyncToken
      },
      message: `Recorded payment of **$${payment.TotalAmt}** (ID: ${payment.Id})${ctx.input.linkedInvoices ? ` applied to ${ctx.input.linkedInvoices.length} invoice(s)` : ''}.`
    };
  })
  .build();

export let getPayment = SlateTool.create(spec, {
  name: 'Get Payment',
  key: 'get_payment',
  description: `Retrieves a payment record by ID with full transaction details and linked invoices.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      paymentId: z.string().describe('QuickBooks Payment ID')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('Payment ID'),
      customerId: z.string().optional().describe('Customer ID'),
      customerName: z.string().optional().describe('Customer name'),
      totalAmount: z.number().describe('Total payment amount'),
      unappliedAmount: z.number().optional().describe('Unapplied amount'),
      txnDate: z.string().optional().describe('Payment date'),
      syncToken: z.string().describe('Sync token'),
      linkedTransactions: z
        .array(
          z.object({
            txnId: z.string(),
            txnType: z.string(),
            amount: z.number().optional()
          })
        )
        .optional()
        .describe('Linked transactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let payment = await client.getPayment(ctx.input.paymentId);

    let linkedTransactions = (payment.Line || []).flatMap((line: any) =>
      (line.LinkedTxn || []).map((txn: any) => ({
        txnId: txn.TxnId,
        txnType: txn.TxnType,
        amount: line.Amount
      }))
    );

    return {
      output: {
        paymentId: payment.Id,
        customerId: payment.CustomerRef?.value,
        customerName: payment.CustomerRef?.name,
        totalAmount: payment.TotalAmt,
        unappliedAmount: payment.UnappliedAmt,
        txnDate: payment.TxnDate,
        syncToken: payment.SyncToken,
        linkedTransactions
      },
      message: `Retrieved payment **$${payment.TotalAmt}** (ID: ${payment.Id}) from customer ${payment.CustomerRef?.name ?? 'N/A'}.`
    };
  })
  .build();
