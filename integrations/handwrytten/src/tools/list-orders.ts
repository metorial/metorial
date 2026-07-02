import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderSchema = z.object({
  orderId: z.string().describe('Unique ID of the order'),
  message: z.string().optional().describe('The handwritten message'),
  status: z
    .string()
    .optional()
    .describe('Order status (processing, written, complete, problem, cancelled)'),
  cardCover: z.string().optional().describe('URL of the card cover image'),
  font: z.string().optional().describe('Handwriting style used'),
  recipientName: z.string().optional().describe('Recipient full name'),
  recipientCity: z.string().optional().describe('Recipient city'),
  recipientState: z.string().optional().describe('Recipient state'),
  senderName: z.string().optional().describe('Sender full name'),
  price: z.string().optional().describe('Order price'),
  dateSend: z.string().optional().describe('Scheduled or actual send date'),
  dateCreated: z.string().optional().describe('Date the order was created')
});

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Retrieve a list of past and current orders with their status. Each order includes details about the message, recipient, sender, card, and current processing status (processing, written, complete, problem, or cancelled).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      orders: z.array(orderSchema).describe('List of orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listOrders();
    let rawOrders = result.orders ?? result.data ?? [];

    let orders = rawOrders.map((o: any) => ({
      orderId: String(o.id ?? o.order_id),
      message: o.message ?? undefined,
      status: o.status ?? undefined,
      cardCover: o.card_cover ?? o.card?.cover ?? undefined,
      font: o.font ?? o.font_label ?? undefined,
      recipientName: o.address_to
        ? [o.address_to.first_name, o.address_to.last_name].filter(Boolean).join(' ') ||
          undefined
        : undefined,
      recipientCity: o.address_to?.city ?? undefined,
      recipientState: o.address_to?.state ?? undefined,
      senderName: o.address_from
        ? [o.address_from.first_name, o.address_from.last_name].filter(Boolean).join(' ') ||
          undefined
        : undefined,
      price: o.price != null ? String(o.price) : undefined,
      dateSend: o.date_send ?? undefined,
      dateCreated: o.date_created ?? o.created_at ?? undefined
    }));

    return {
      output: { orders },
      message: `Found **${orders.length}** orders.`
    };
  })
  .build();
