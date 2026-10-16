import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { storeIdSchema } from '../lib/schemas';
import { requireFields } from '../lib/values';
import { spec } from '../spec';

export let manageInvoice = SlateTool.create(spec, {
  name: 'Manage Invoice',
  key: 'manage_invoice',
  description:
    'Update invoice metadata, archive or unarchive an invoice, or manually mark its status. Discover stores with manage_stores and invoices with get_invoices. Manual marking requires btcpay.store.canmanageinvoicestatus; metadata and archive operations require btcpay.store.canmodifyinvoices.',
  constraints: [
    'Manual status changes follow the server lifecycle rules; they do not send or refund funds.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      action: z.enum(['update', 'archive', 'unarchive', 'mark_status']),
      storeId: storeIdSchema,
      invoiceId: z.string().describe('Invoice ID from get_invoices'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Invoice metadata for update'),
      status: z
        .enum(['Invalid', 'Settled'])
        .optional()
        .describe(
          'Required for mark_status. Check availableStatusesForManualMarking in get_invoices raw data.'
        )
    })
  )
  .output(
    z.object({
      invoice: z.record(z.string(), z.unknown()).optional(),
      archived: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let { action, storeId, invoiceId } = ctx.input;
    if (action === 'mark_status') requireFields(ctx.input, ['status'], action);
    if (action === 'update') requireFields(ctx.input, ['metadata'], action);
    let body =
      action === 'mark_status'
        ? { status: ctx.input.status }
        : action === 'update'
          ? { metadata: ctx.input.metadata }
          : undefined;
    let invoice = await new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    }).manageInvoice(storeId, invoiceId, action, body);
    return {
      output: { invoice, ...(action === 'archive' ? { archived: true } : {}) },
      message: `Completed invoice ${action} for **${invoiceId}**.`
    };
  })
  .build();
