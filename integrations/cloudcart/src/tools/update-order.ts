import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update an existing order's status, Unique Sale Number, administrator note, or custom metadata. Mark orders as paid, completed, or cancelled. Fulfillment changes require the store's fulfillment workflow.`,
  instructions: [
    'Valid order statuses: pending, voided, timeouted, cancelled, failed, refunded, paid, completed (complete is accepted as a legacy alias).',
    'Fulfillment status is read-only on orders. Change fulfillment through the store admin or the separate order-fulfillment API; omit statusFulfillment from this tool.'
  ]
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the order to update'),
      status: z
        .enum([
          'pending',
          'voided',
          'timeouted',
          'cancelled',
          'failed',
          'refunded',
          'paid',
          'complete',
          'completed'
        ])
        .optional()
        .describe('New order status'),
      statusFulfillment: z
        .enum(['not_fulfilled', 'fulfilled'])
        .optional()
        .describe(
          'Legacy field: fulfillment status is read-only. Omit this field and use the store fulfillment workflow instead'
        ),
      usn: z.string().optional().describe('Order USN (Unique Sale Number)'),
      noteAdministrator: z.string().optional().describe('Internal admin note for the order'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata to attach to the order')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional(),
      orderId: z.string(),
      status: z.string().optional(),
      statusFulfillment: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.statusFulfillment !== undefined) {
      throw createApiServiceError(
        'Order fulfillment status is read-only. Omit statusFulfillment and change fulfillment in the store admin or through the separate order-fulfillment API. No order changes were made.'
      );
    }
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let attributes: Record<string, any> = {};
    if (ctx.input.status !== undefined)
      attributes.status = ctx.input.status === 'complete' ? 'completed' : ctx.input.status;
    if (ctx.input.usn !== undefined) attributes.usn = ctx.input.usn;
    if (ctx.input.noteAdministrator !== undefined)
      attributes.note_administrator = ctx.input.noteAdministrator;

    let res = await client.updateOrder(ctx.input.orderId, attributes, ctx.input.metadata);
    let o = res.data;

    return {
      output: {
        raw: res,
        orderId: o.id,
        status: o.attributes.status ?? undefined,
        statusFulfillment: o.attributes.status_fulfillment ?? undefined,
        updatedAt: o.attributes.updated_at ?? undefined
      },
      message: `Updated order **#${o.id}** — status: **${o.attributes.status}**, fulfillment: **${o.attributes.status_fulfillment}**.`
    };
  })
  .build();
