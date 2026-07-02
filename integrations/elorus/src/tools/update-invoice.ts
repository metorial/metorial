import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update an existing invoice. Partial updates (PATCH) work on any status but cannot modify line items. Full updates (PUT) only work on draft invoices and can modify line items.`,
  instructions: [
    'Only draft invoices can have their line items modified (requires full update).',
    'For issued invoices, only metadata fields like reference, custom_id, and due_date can be changed.'
  ],
  constraints: ['Line items can only be modified on draft invoices.']
})
  .input(
    z.object({
      invoiceId: z.string().describe('The unique ID of the invoice to update.'),
      date: z.string().optional().describe('Updated invoice date (YYYY-MM-DD).'),
      dueDate: z.string().optional().describe('Updated due date (YYYY-MM-DD).'),
      reference: z.string().optional().describe('Updated reference or PO number.'),
      customId: z.string().optional().describe('Updated custom external identifier.')
    })
  )
  .output(
    z.object({
      invoice: z.any().describe('The updated invoice object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: any = {};
    if (ctx.input.date) body.date = ctx.input.date;
    if (ctx.input.dueDate) body.due_date = ctx.input.dueDate;
    if (ctx.input.reference) body.reference = ctx.input.reference;
    if (ctx.input.customId) body.custom_id = ctx.input.customId;

    let invoice = await client.updateInvoice(ctx.input.invoiceId, body, true);

    return {
      output: { invoice },
      message: `Updated invoice **${invoice.sequence_flat || invoice.id}**`
    };
  })
  .build();
