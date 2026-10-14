import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getInvoiceDueDays } from '../lib/documents';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update the external identifier of any invoice. Invoice and due dates can be updated only while the invoice is a draft. Existing document details and line items are preserved when updating dates.`,
  instructions: [
    'Only draft invoices can have their line items modified (requires full update).',
    'For issued invoices, use customId to update the external identifier.'
  ],
  constraints: ['Line items can only be modified on draft invoices.']
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      invoiceId: z.string().describe('The unique ID of the invoice to update.'),
      date: z.string().optional().describe('Updated invoice date (YYYY-MM-DD).'),
      dueDate: z.string().optional().describe('Updated due date (YYYY-MM-DD).'),
      reference: z
        .string()
        .optional()
        .describe('Legacy unsupported field. Use customId for an external reference.'),
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
      organizationId: ctx.input.organizationId ?? ctx.config.organizationId
    });

    if (ctx.input.reference !== undefined) {
      throw createApiServiceError(
        'Elorus has no general invoice reference field. Use customId for an external reference.',
        { reason: 'unsupported_invoice_reference' }
      );
    }
    let body: Record<string, unknown> = {};
    if (ctx.input.customId !== undefined) body.custom_id = ctx.input.customId;
    let invoice: Record<string, unknown>;
    if (ctx.input.date !== undefined || ctx.input.dueDate !== undefined) {
      let current = await client.getInvoice(ctx.input.invoiceId);
      if (!current.draft) {
        throw createApiServiceError(
          'Invoice and due dates can only be updated on draft invoices.',
          { reason: 'invoice_not_draft' }
        );
      }
      body = { ...current, ...body };
      if (ctx.input.date !== undefined) body.date = ctx.input.date;
      if (ctx.input.dueDate !== undefined)
        body.due_days = getInvoiceDueDays(String(body.date), ctx.input.dueDate);
      invoice = await client.updateInvoice(ctx.input.invoiceId, body, false);
    } else {
      invoice = await client.updateInvoice(ctx.input.invoiceId, body, true);
    }

    return {
      output: { invoice },
      message: `Updated invoice **${invoice.sequence_flat || invoice.id}**`
    };
  })
  .build();
