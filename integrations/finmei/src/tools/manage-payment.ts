import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let managePayment = SlateTool.create(spec, {
  name: 'Manage Payment',
  key: 'manage_payment',
  description: `Record a new payment against an invoice, retrieve payment details, or delete a payment in Finmei. Use this to track payments received for invoices.`,
  instructions: [
    'To **record** a new payment, set action to "create" and provide the **invoiceId** and **amount**.',
    'To **retrieve** a payment, set action to "get" and provide the **paymentId**.',
    'To **delete** a payment, set action to "delete" and provide the **paymentId**.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'delete']).describe('Action to perform'),
      paymentId: z.string().optional().describe('Payment ID (required for get and delete)'),
      invoiceId: z
        .string()
        .optional()
        .describe('Invoice ID to record the payment against (required for create)'),
      amount: z.number().optional().describe('Payment amount (required for create)'),
      date: z.string().optional().describe('Payment date in YYYY-MM-DD format'),
      mode: z
        .string()
        .optional()
        .describe('Payment mode/method (e.g., "bank_transfer", "cash", "card")'),
      reference: z.string().optional().describe('Payment reference number or transaction ID'),
      notes: z.string().optional().describe('Additional notes about the payment')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      paymentId: z.string().optional().describe('Payment ID'),
      payment: z.any().optional().describe('Payment details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.paymentId) {
        throw new Error('paymentId is required for delete action');
      }
      await client.deletePayment(ctx.input.paymentId);

      return {
        output: {
          success: true,
          paymentId: ctx.input.paymentId
        },
        message: `Deleted payment \`${ctx.input.paymentId}\`.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.paymentId) {
        throw new Error('paymentId is required for get action');
      }
      let result = await client.getPayment(ctx.input.paymentId);
      let payment = result?.data ?? result;

      return {
        output: {
          success: true,
          paymentId: String(payment?.id ?? ctx.input.paymentId),
          payment
        },
        message: `Retrieved payment \`${ctx.input.paymentId}\`.`
      };
    }

    // create
    if (!ctx.input.invoiceId) {
      throw new Error('invoiceId is required to record a payment');
    }

    let result = await client.createPayment({
      invoice_id: ctx.input.invoiceId,
      amount: ctx.input.amount,
      date: ctx.input.date,
      mode: ctx.input.mode,
      reference: ctx.input.reference,
      notes: ctx.input.notes
    });

    let payment = result?.data ?? result;
    let paymentId = String(payment?.id ?? '');

    return {
      output: {
        success: true,
        paymentId,
        payment
      },
      message: `Recorded payment of **${ctx.input.amount}** for invoice \`${ctx.input.invoiceId}\` (Payment ID: ${paymentId}).`
    };
  })
  .build();
