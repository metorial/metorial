import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let paymentEventSchema = z.object({
  paymentId: z.string().describe('Xero payment ID'),
  date: z.string().optional().describe('Payment date'),
  amount: z.number().optional().describe('Payment amount'),
  reference: z.string().optional().describe('Payment reference'),
  status: z.string().optional().describe('Payment status'),
  paymentType: z.string().optional().describe('Payment type'),
  isReconciled: z.boolean().optional().describe('Whether reconciled'),
  invoiceId: z.string().optional().describe('Related invoice ID'),
  invoiceNumber: z.string().optional().describe('Related invoice number'),
  accountCode: z.string().optional().describe('Account code'),
  bankAmount: z.number().optional().describe('Bank amount'),
  updatedDate: z.string().optional().describe('Last updated timestamp')
});

export let paymentChanges = SlateTrigger.create(spec, {
  name: 'Payment Changes',
  key: 'payment_changes',
  description: 'Triggers when payments are created, updated, or reconciled in Xero.'
})
  .input(
    z.object({
      paymentId: z.string().describe('Xero payment ID'),
      date: z.string().optional(),
      amount: z.number().optional(),
      reference: z.string().optional(),
      status: z.string().optional(),
      paymentType: z.string().optional(),
      isReconciled: z.boolean().optional(),
      invoiceId: z.string().optional(),
      invoiceNumber: z.string().optional(),
      accountCode: z.string().optional(),
      bankAmount: z.number().optional(),
      updatedDate: z.string().optional()
    })
  )
  .output(paymentEventSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClientFromContext(ctx);

      let lastModified = (ctx.state as any)?.lastModified as string | undefined;

      let result = await client.getPayments({
        modifiedAfter: lastModified,
        order: 'UpdatedDateUTC ASC'
      });

      let payments = result.Payments || [];

      let newLastModified = lastModified;
      if (payments.length > 0) {
        let lastPayment = payments[payments.length - 1];
        if (lastPayment?.UpdatedDateUTC) {
          newLastModified = lastPayment.UpdatedDateUTC;
        }
      }

      return {
        inputs: payments.map(p => ({
          paymentId: p.PaymentID || '',
          date: p.Date,
          amount: p.Amount,
          reference: p.Reference,
          status: p.Status,
          paymentType: p.PaymentType,
          isReconciled: p.IsReconciled,
          invoiceId: p.Invoice?.InvoiceID,
          invoiceNumber: p.Invoice?.InvoiceNumber,
          accountCode: p.Account?.Code,
          bankAmount: p.BankAmount,
          updatedDate: p.UpdatedDateUTC
        })),
        updatedState: {
          lastModified: newLastModified
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'payment.updated',
        id: `${ctx.input.paymentId}-${ctx.input.updatedDate || Date.now()}`,
        output: {
          paymentId: ctx.input.paymentId,
          date: ctx.input.date,
          amount: ctx.input.amount,
          reference: ctx.input.reference,
          status: ctx.input.status,
          paymentType: ctx.input.paymentType,
          isReconciled: ctx.input.isReconciled,
          invoiceId: ctx.input.invoiceId,
          invoiceNumber: ctx.input.invoiceNumber,
          accountCode: ctx.input.accountCode,
          bankAmount: ctx.input.bankAmount,
          updatedDate: ctx.input.updatedDate
        }
      };
    }
  })
  .build();
