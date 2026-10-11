import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { spec } from '../spec';

let moneySchema = z
  .object({
    value: z
      .string()
      .optional()
      .describe(
        'Display amount in the major currency unit; may include grouping separators such as "2,000.00".'
      ),
    minorUnitValue: z
      .string()
      .optional()
      .describe(
        'Exact amount in the minor currency unit, such as cents, as a decimal string.'
      ),
    currency: z
      .object({
        code: z.string().optional(),
        symbol: z.string().optional()
      })
      .optional()
  })
  .optional();

export let recordInvoicePayment = SlateTool.create(spec, {
  name: 'Record Invoice Payment',
  key: 'record_invoice_payment',
  tags: { readOnly: false },
  description: `Record a payment received outside Wave, such as cash, cheque or bank transfer, against an existing invoice. The payment is deposited to the chosen bank or cash account and reduces the invoice's amount due. This records the payment in the books; it does not charge the customer or move funds.`,
  instructions: [
    'Approve a draft invoice with approve_invoice before recording a payment against it.',
    'Find paymentAccountId with list_accounts using subtypes ["CASH_AND_BANK"] (or another account that receives the money).',
    'Do not record a payment Wave already matched from a connected bank or Wave Payments; that would count it twice.',
    'Supply exchangeRate only when the payment account currency differs from the invoice currency; it defaults to 1.'
  ],
  constraints: [
    'A payment recorded in error must be removed in Wave; this tool does not retry an uncertain result.'
  ]
})
  .scopes(anyOf('invoice:write'))
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the approved invoice the payment applies to'),
      paymentAccountId: z
        .string()
        .describe(
          'ID of the account the payment was deposited to, usually a CASH_AND_BANK account from list_accounts.'
        ),
      amount: z
        .number()
        .describe('Positive payment amount in the invoice currency, such as 150.25'),
      paymentDate: z.string().describe('Date the payment was received (YYYY-MM-DD)'),
      paymentMethod: z
        .enum([
          'BANK_TRANSFER',
          'CASH',
          'CHEQUE',
          'CREDIT_CARD',
          'PAYPAL',
          'OTHER',
          'UNSPECIFIED'
        ])
        .describe('How the customer paid'),
      exchangeRate: z
        .number()
        .optional()
        .describe(
          "Exchange rate from the invoice currency to the payment account's currency; only used when they differ (default: 1)."
        ),
      memo: z.string().optional().describe('Optional internal note for the payment')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('ID of the recorded invoice payment'),
      invoiceId: z.string().describe('ID of the invoice the payment was applied to'),
      amount: z.string().optional().describe('Recorded payment amount as reported by Wave'),
      paymentDate: z.string().optional().describe('Payment date (YYYY-MM-DD)'),
      paymentMethod: z.string().optional().describe('Recorded payment method'),
      memo: z.string().optional().describe('Payment memo'),
      exchangeRate: z.string().optional().describe('Exchange rate as a decimal string'),
      paymentAccount: z
        .object({
          accountId: z.string().optional(),
          name: z.string().optional()
        })
        .optional()
        .describe('Account the payment was deposited to'),
      invoiceStatus: z
        .string()
        .optional()
        .describe('Invoice status after the payment, such as PARTIAL or PAID'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      amountDue: moneySchema.describe('Invoice amount still due after the payment'),
      amountPaid: moneySchema.describe('Total amount paid on the invoice'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.recordInvoicePayment(ctx.input);
    let payment = result.data;

    return {
      output: {
        paymentId: payment.id,
        invoiceId: payment.invoice?.id ?? ctx.input.invoiceId,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        memo: payment.memo,
        exchangeRate: payment.exchangeRate,
        paymentAccount: payment.account
          ? { accountId: payment.account.id, name: payment.account.name }
          : undefined,
        invoiceStatus: payment.invoice?.status,
        invoiceNumber: payment.invoice?.invoiceNumber,
        amountDue: payment.invoice?.amountDue,
        amountPaid: payment.invoice?.amountPaid,
        createdAt: payment.createdAt
      },
      message: `Recorded payment \`${payment.id}\` of ${payment.amount ?? ctx.input.amount} on invoice ${
        payment.invoice
          ? `**#${payment.invoice.invoiceNumber}** (status: ${payment.invoice.status})`
          : `\`${ctx.input.invoiceId}\``
      }.`
    };
  })
  .build();
