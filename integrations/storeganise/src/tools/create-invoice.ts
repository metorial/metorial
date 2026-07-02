import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createInvoiceTool = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice for a tenant/customer. Specify the user, line items with descriptions and amounts, and optional due date. The invoice is created in draft state by default.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('The user/tenant ID to create the invoice for'),
      items: z
        .array(
          z.object({
            description: z.string().describe('Line item description'),
            amount: z.number().describe('Amount for this line item'),
            quantity: z.number().optional().describe('Quantity (defaults to 1)')
          })
        )
        .describe('Invoice line items'),
      dueDate: z.string().optional().describe('Due date in ISO format (e.g. 2024-02-15)'),
      notes: z.string().optional().describe('Additional notes to include on the invoice')
    })
  )
  .output(
    z.object({
      invoice: z.record(z.string(), z.any()).describe('The created invoice')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let invoiceData: Record<string, any> = {
      ownerId: ctx.input.userId,
      items: ctx.input.items
    };

    if (ctx.input.dueDate) invoiceData.dueDate = ctx.input.dueDate;
    if (ctx.input.notes) invoiceData.notes = ctx.input.notes;

    let invoice = await client.createInvoice(invoiceData);

    return {
      output: { invoice },
      message: `Created invoice **${invoice.number || invoice._id}** for user ${ctx.input.userId}.`
    };
  })
  .build();
