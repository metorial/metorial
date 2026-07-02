import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update an existing order's properties such as status, staff notes, customer message, shipping addresses, or billing address. Also supports archiving an order.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('The ID of the order to update'),
      statusId: z.number().optional().describe('New order status ID'),
      staffNotes: z.string().optional().describe('Staff-only notes on the order'),
      customerMessage: z.string().optional().describe('Customer message for the order'),
      billingAddress: z.any().optional().describe('Updated billing address object'),
      shippingAddresses: z.array(z.any()).optional().describe('Updated shipping addresses'),
      archive: z.boolean().optional().describe('Set to true to archive the order')
    })
  )
  .output(
    z.object({
      order: z.any().describe('The updated order object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    if (ctx.input.archive) {
      await client.archiveOrder(ctx.input.orderId);
      return {
        output: { order: { id: ctx.input.orderId, archived: true } },
        message: `Archived order #${ctx.input.orderId}.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.statusId !== undefined) data.status_id = ctx.input.statusId;
    if (ctx.input.staffNotes) data.staff_notes = ctx.input.staffNotes;
    if (ctx.input.customerMessage) data.customer_message = ctx.input.customerMessage;
    if (ctx.input.billingAddress) data.billing_address = ctx.input.billingAddress;
    if (ctx.input.shippingAddresses) data.shipping_addresses = ctx.input.shippingAddresses;

    let order = await client.updateOrder(ctx.input.orderId, data);

    return {
      output: {
        order
      },
      message: `Updated order #${order.id} (status: ${order.status}).`
    };
  })
  .build();
