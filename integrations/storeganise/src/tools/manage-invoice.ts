import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageInvoiceTool = SlateTool.create(spec, {
  name: 'Manage Invoice',
  key: 'manage_invoice',
  description: `Perform actions on an existing invoice: update its details, add a payment, add a comment to its history, or delete it. Use the **action** field to specify the operation.`,
  instructions: [
    'Set action to "update" to modify invoice fields.',
    'Set action to "add_payment" to record a payment against the invoice.',
    'Set action to "add_comment" to add a note to the invoice history.',
    'Set action to "delete" to permanently remove the invoice.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The invoice ID'),
      action: z
        .enum(['update', 'add_payment', 'add_comment', 'delete'])
        .describe('Action to perform on the invoice'),
      updateFields: z
        .object({
          state: z
            .string()
            .optional()
            .describe('New invoice state (e.g. "sent", "paid", "void")'),
          dueDate: z.string().optional().describe('Updated due date in ISO format'),
          notes: z.string().optional().describe('Updated notes')
        })
        .optional()
        .describe('Fields to update (required when action is "update")'),
      paymentAmount: z
        .number()
        .optional()
        .describe('Payment amount (required when action is "add_payment")'),
      paymentMethod: z
        .string()
        .optional()
        .describe('Payment method description (e.g. "cash", "bank_transfer", "card")'),
      comment: z
        .string()
        .optional()
        .describe('Comment text (required when action is "add_comment")')
    })
  )
  .output(
    z.object({
      invoice: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated invoice details (not returned for delete action)'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action, invoiceId } = ctx.input;

    if (action === 'update') {
      let invoice = await client.updateInvoice(invoiceId, ctx.input.updateFields || {});
      return {
        output: { invoice, success: true },
        message: `Updated invoice **${invoice.number || invoiceId}**.`
      };
    }

    if (action === 'add_payment') {
      let paymentData: Record<string, any> = {
        amount: ctx.input.paymentAmount
      };
      if (ctx.input.paymentMethod) paymentData.method = ctx.input.paymentMethod;

      let invoice = await client.addInvoicePayment(invoiceId, paymentData);
      return {
        output: { invoice, success: true },
        message: `Added payment of **${ctx.input.paymentAmount}** to invoice ${invoiceId}.`
      };
    }

    if (action === 'add_comment') {
      await client.addInvoiceComment(invoiceId, ctx.input.comment || '');
      let invoice = await client.getInvoice(invoiceId);
      return {
        output: { invoice, success: true },
        message: `Added comment to invoice ${invoiceId}.`
      };
    }

    if (action === 'delete') {
      await client.deleteInvoice(invoiceId);
      return {
        output: { success: true },
        message: `Deleted invoice ${invoiceId}.`
      };
    }

    return {
      output: { success: false },
      message: `Unknown action: ${action}`
    };
  })
  .build();
