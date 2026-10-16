import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update an existing invoice in FreeAgent. Use status transitions to change invoice status (mark as sent, cancelled, draft, or scheduled). Only the provided fields will be modified.`,
  instructions: [
    'To change invoice status, use the "transition" field with one of: mark_as_sent, mark_as_scheduled, mark_as_draft, mark_as_cancelled.',
    'Status transitions and field updates cannot be combined in a single call. Calls combining a transition with field updates are rejected.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The FreeAgent invoice ID to update'),
      transition: z
        .enum(['mark_as_sent', 'mark_as_scheduled', 'mark_as_draft', 'mark_as_cancelled'])
        .optional()
        .describe('Status transition to apply'),
      datedOn: z.string().optional().describe('Invoice date in YYYY-MM-DD format'),
      paymentTermsInDays: z.number().optional().describe('Payment terms in days'),
      reference: z.string().optional().describe('Invoice reference'),
      currency: z.string().optional().describe('Currency code'),
      comments: z.string().optional().describe('Invoice comments')
    })
  )
  .output(
    z.object({
      invoice: z.record(z.string(), z.any()).describe('The updated invoice record')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.transition &&
      [
        ctx.input.datedOn,
        ctx.input.paymentTermsInDays,
        ctx.input.reference,
        ctx.input.currency,
        ctx.input.comments
      ].some(value => value !== undefined)
    ) {
      throw createApiServiceError(
        'Apply an invoice transition separately from field updates.'
      );
    }

    let client = createClient(ctx);

    if (ctx.input.transition) {
      let invoice = await client.transitionInvoice(ctx.input.invoiceId, ctx.input.transition);
      return {
        output: { invoice },
        message: `Applied transition **${ctx.input.transition}** to invoice **${ctx.input.invoiceId}**`
      };
    }

    let invoiceData: Record<string, any> = {};
    if (ctx.input.datedOn) invoiceData.dated_on = ctx.input.datedOn;
    if (ctx.input.paymentTermsInDays !== undefined)
      invoiceData.payment_terms_in_days = ctx.input.paymentTermsInDays;
    if (ctx.input.reference) invoiceData.reference = ctx.input.reference;
    if (ctx.input.currency) invoiceData.currency = ctx.input.currency;
    if (ctx.input.comments) invoiceData.comments = ctx.input.comments;

    let invoice = await client.updateInvoice(ctx.input.invoiceId, invoiceData);

    return {
      output: { invoice },
      message: `Updated invoice **${ctx.input.invoiceId}**`
    };
  })
  .build();
