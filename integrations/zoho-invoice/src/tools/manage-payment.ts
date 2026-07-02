import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePayment = SlateTool.create(spec, {
  name: 'Manage Payment',
  key: 'manage_payment',
  description: `Creates or updates a customer payment in Zoho Invoice.
If **paymentId** is provided, updates the existing payment. Otherwise, creates a new payment.
The **customerId**, **amount**, and **date** fields are required when creating a new payment.
Optionally apply the payment to specific invoices via the **invoices** array.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      paymentId: z
        .string()
        .optional()
        .describe('ID of the payment to update. If omitted, a new payment is created.'),
      customerId: z
        .string()
        .optional()
        .describe('ID of the customer (required when creating a new payment)'),
      amount: z
        .number()
        .optional()
        .describe('Payment amount (required when creating a new payment)'),
      date: z
        .string()
        .optional()
        .describe('Payment date in YYYY-MM-DD format (required when creating a new payment)'),
      paymentMode: z
        .string()
        .optional()
        .describe('Mode of payment (e.g. cash, check, bank_transfer, credit_card)'),
      referenceNumber: z.string().optional().describe('Reference number for the payment'),
      description: z.string().optional().describe('Description of the payment'),
      invoices: z
        .array(
          z.object({
            invoiceId: z.string().describe('ID of the invoice to apply payment to'),
            amountApplied: z.number().describe('Amount to apply to this invoice')
          })
        )
        .optional()
        .describe('Array of invoices to apply this payment to')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('Unique ID of the payment'),
      customerId: z.string().describe('ID of the customer'),
      customerName: z.string().describe('Name of the customer'),
      amount: z.number().describe('Payment amount'),
      date: z.string().describe('Payment date'),
      paymentMode: z.string().describe('Mode of payment'),
      referenceNumber: z.string().describe('Reference number of the payment'),
      description: z.string().describe('Description of the payment'),
      invoices: z
        .array(
          z.object({
            invoiceId: z.string().describe('ID of the invoice'),
            invoiceNumber: z.string().describe('Invoice number'),
            amountApplied: z.number().describe('Amount applied to this invoice')
          })
        )
        .describe('Array of invoices this payment is applied to'),
      createdTime: z.string().describe('Timestamp when the payment was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let data: Record<string, any> = {};

    if (ctx.input.customerId !== undefined) data.customer_id = ctx.input.customerId;
    if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
    if (ctx.input.date !== undefined) data.date = ctx.input.date;
    if (ctx.input.paymentMode !== undefined) data.payment_mode = ctx.input.paymentMode;
    if (ctx.input.referenceNumber !== undefined)
      data.reference_number = ctx.input.referenceNumber;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.invoices !== undefined) {
      data.invoices = ctx.input.invoices.map(inv => ({
        invoice_id: inv.invoiceId,
        amount_applied: inv.amountApplied
      }));
    }

    let payment: any;
    let action: string;

    if (ctx.input.paymentId) {
      payment = await client.updatePayment(ctx.input.paymentId, data);
      action = 'updated';
    } else {
      payment = await client.createPayment(data);
      action = 'created';
    }

    let invoices = (payment.invoices ?? []).map((inv: any) => ({
      invoiceId: inv.invoice_id ?? '',
      invoiceNumber: inv.invoice_number ?? '',
      amountApplied: inv.amount_applied ?? 0
    }));

    return {
      output: {
        paymentId: payment.payment_id ?? '',
        customerId: payment.customer_id ?? '',
        customerName: payment.customer_name ?? '',
        amount: payment.amount ?? 0,
        date: payment.date ?? '',
        paymentMode: payment.payment_mode ?? '',
        referenceNumber: payment.reference_number ?? '',
        description: payment.description ?? '',
        invoices,
        createdTime: payment.created_time ?? ''
      },
      message: `Successfully ${action} payment **${payment.payment_id}** for customer **${payment.customer_name ?? payment.customer_id}**.`
    };
  })
  .build();
