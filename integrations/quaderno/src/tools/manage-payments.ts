import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let paymentOutputSchema = z.object({
  paymentId: z.string().optional().describe('Payment ID'),
  date: z.string().optional().describe('Payment date'),
  amount: z.string().optional().describe('Payment amount'),
  paymentMethod: z.string().optional().describe('Payment method')
});

export let recordPayment = SlateTool.create(spec, {
  name: 'Record Payment',
  key: 'record_payment',
  description: `Record a payment against an invoice, credit note, or expense in Quaderno. Supports partial payments.`,
  instructions: ['documentType must be "invoices", "credits", or "expenses"'],
  tags: { destructive: false }
})
  .input(
    z.object({
      documentType: z
        .enum(['invoices', 'credits', 'expenses'])
        .describe('Type of document to record payment for'),
      documentId: z.string().describe('ID of the document'),
      amount: z.string().optional().describe('Payment amount (defaults to total if omitted)'),
      date: z.string().optional().describe('Payment date in YYYY-MM-DD format'),
      paymentMethod: z
        .string()
        .optional()
        .describe('Payment method (e.g., "credit_card", "cash", "wire_transfer", "paypal")')
    })
  )
  .output(paymentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {};
    if (ctx.input.amount) data.amount = ctx.input.amount;
    if (ctx.input.date) data.date = ctx.input.date;
    if (ctx.input.paymentMethod) data.payment_method = ctx.input.paymentMethod;

    let p = await client.createPayment(ctx.input.documentType, ctx.input.documentId, data);

    return {
      output: {
        paymentId: p.id?.toString(),
        date: p.date,
        amount: p.amount,
        paymentMethod: p.payment_method
      },
      message: `Recorded payment of **${p.amount || 'full amount'}** on ${ctx.input.documentType} **${ctx.input.documentId}**`
    };
  })
  .build();

export let deletePayment = SlateTool.create(spec, {
  name: 'Delete Payment',
  key: 'delete_payment',
  description: `Delete a payment record from an invoice, credit note, or expense in Quaderno.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      documentType: z.enum(['invoices', 'credits', 'expenses']).describe('Type of document'),
      documentId: z.string().describe('ID of the document'),
      paymentId: z.string().describe('ID of the payment to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the payment was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deletePayment(
      ctx.input.documentType,
      ctx.input.documentId,
      ctx.input.paymentId
    );

    return {
      output: { success: true },
      message: `Deleted payment **${ctx.input.paymentId}** from ${ctx.input.documentType} **${ctx.input.documentId}**`
    };
  })
  .build();
