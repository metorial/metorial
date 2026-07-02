import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve detailed information about a specific ticket order by its ID. Returns buyer details, costs, attendee information, and order status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The ID of the order to retrieve.')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('The unique order ID.'),
      eventId: z.string().optional().describe('The event the order belongs to.'),
      name: z.string().optional().describe('Name on the order.'),
      firstName: z.string().optional().describe('Buyer first name.'),
      lastName: z.string().optional().describe('Buyer last name.'),
      email: z.string().optional().describe('Buyer email address.'),
      status: z.string().optional().describe('Order status.'),
      created: z.string().optional().describe('When the order was created.'),
      changed: z.string().optional().describe('When the order was last changed.'),
      costs: z
        .object({
          gross: z.string().optional(),
          tax: z.string().optional(),
          fees: z.string().optional(),
          payment: z.string().optional()
        })
        .optional()
        .describe('Cost breakdown.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let order = await client.getOrder(ctx.input.orderId);

    return {
      output: {
        orderId: order.id,
        eventId: order.event_id,
        name: order.name,
        firstName: order.first_name,
        lastName: order.last_name,
        email: order.email,
        status: order.status,
        created: order.created,
        changed: order.changed,
        costs: order.costs
          ? {
              gross: order.costs.gross?.display,
              tax: order.costs.tax?.display,
              fees: order.costs.eventbrite_fee?.display,
              payment: order.costs.payment_fee?.display
            }
          : undefined
      },
      message: `Retrieved order \`${order.id}\` for **${order.name || 'unknown'}** (status: ${order.status}).`
    };
  })
  .build();
