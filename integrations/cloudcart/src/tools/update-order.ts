import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update an existing order's status, fulfillment status, notes, or other attributes. Use this to manage order lifecycle such as marking orders as paid, fulfilled, or cancelled.`,
  instructions: [
    'Valid order statuses: pending, voided, timeouted, cancelled, failed, refunded, paid, complete.',
    'Valid fulfillment statuses: not_fulfilled, fulfilled.'
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
          'complete'
        ])
        .optional()
        .describe('New order status'),
      statusFulfillment: z
        .enum(['not_fulfilled', 'fulfilled'])
        .optional()
        .describe('New fulfillment status'),
      usn: z.string().optional().describe('Unique shipment number / tracking number'),
      noteAdministrator: z.string().optional().describe('Internal admin note for the order'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata to attach to the order')
    })
  )
  .output(
    z.object({
      orderId: z.string(),
      status: z.string().optional(),
      statusFulfillment: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let attributes: Record<string, any> = {};
    if (ctx.input.status !== undefined) attributes.status = ctx.input.status;
    if (ctx.input.statusFulfillment !== undefined)
      attributes.status_fulfillment = ctx.input.statusFulfillment;
    if (ctx.input.usn !== undefined) attributes.usn = ctx.input.usn;
    if (ctx.input.noteAdministrator !== undefined)
      attributes.note_administrator = ctx.input.noteAdministrator;

    let res = await client.updateOrder(ctx.input.orderId, attributes, ctx.input.metadata);
    let o = res.data;

    return {
      output: {
        orderId: o.id,
        status: o.attributes.status,
        statusFulfillment: o.attributes.status_fulfillment,
        updatedAt: o.attributes.updated_at
      },
      message: `Updated order **#${o.id}** — status: **${o.attributes.status}**, fulfillment: **${o.attributes.status_fulfillment}**.`
    };
  })
  .build();
