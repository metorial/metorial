import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let recordCustomerPayment = SlateTool.create(spec, {
  name: 'Record Customer Payment',
  key: 'record_customer_payment',
  description: `Record a payment received from a customer, optionally linked to specific invoices. Supports multiple invoice associations per payment.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Customer contact ID'),
      amount: z.number().describe('Payment amount'),
      date: z.string().describe('Payment date (YYYY-MM-DD)'),
      paymentMode: z
        .string()
        .optional()
        .describe('Payment mode (e.g., "cash", "bank_transfer", "check")'),
      referenceNumber: z.string().optional().describe('Reference number'),
      description: z.string().optional().describe('Payment description'),
      invoices: z
        .array(
          z.object({
            invoiceId: z.string().describe('Invoice ID'),
            amountApplied: z.number().describe('Amount applied to this invoice')
          })
        )
        .optional()
        .describe('Invoices to apply the payment to'),
      accountId: z.string().optional().describe('Deposit-to account ID')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('Payment ID'),
      paymentNumber: z.string().optional().describe('Payment number'),
      customerName: z.string().optional().describe('Customer name'),
      amount: z.number().optional().describe('Payment amount'),
      date: z.string().optional().describe('Payment date'),
      paymentMode: z.string().optional().describe('Payment mode')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {
      customer_id: ctx.input.customerId,
      amount: ctx.input.amount,
      date: ctx.input.date
    };

    if (ctx.input.paymentMode !== undefined) body.payment_mode = ctx.input.paymentMode;
    if (ctx.input.referenceNumber !== undefined)
      body.reference_number = ctx.input.referenceNumber;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.accountId !== undefined) body.account_id = ctx.input.accountId;

    if (ctx.input.invoices) {
      body.invoices = ctx.input.invoices.map(inv => ({
        invoice_id: inv.invoiceId,
        amount_applied: inv.amountApplied
      }));
    }

    let result = await client.createCustomerPayment(body);
    let payment = result.payment;

    return {
      output: {
        paymentId: String(payment.payment_id),
        paymentNumber: payment.payment_number ?? undefined,
        customerName: payment.customer_name ?? undefined,
        amount: payment.amount ?? undefined,
        date: payment.date ?? undefined,
        paymentMode: payment.payment_mode ?? undefined
      },
      message: `Payment **${payment.payment_number}** of ${payment.amount} recorded for customer **${payment.customer_name}**.`
    };
  })
  .build();
