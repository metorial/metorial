import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let fulfillOrder = SlateTool.create(spec, {
  name: 'Fulfill Order',
  key: 'fulfill_order',
  description: `Mark a Squarespace order as fulfilled by adding shipment tracking information. Can optionally notify the customer via email. Additional shipments can be added to an order at any time, even if already fulfilled.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The unique identifier of the order to fulfill'),
      shouldSendNotification: z
        .boolean()
        .describe('Whether to send a fulfillment notification email to the customer'),
      shipments: z
        .array(
          z.object({
            shipDate: z.string().describe('ISO 8601 UTC ship date'),
            carrierName: z
              .string()
              .describe('Name of the shipping carrier (e.g., "USPS", "FedEx")'),
            service: z.string().describe('Shipping service level (e.g., "Priority Mail")'),
            trackingNumber: z.string().describe('Carrier tracking number'),
            trackingUrl: z.string().optional().describe('URL for tracking the shipment')
          })
        )
        .describe('Shipment details for the fulfillment')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('The fulfilled order ID'),
      shipmentsAdded: z.number().describe('Number of shipments added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.fulfillOrder(ctx.input.orderId, {
      shouldSendNotification: ctx.input.shouldSendNotification,
      shipments: ctx.input.shipments
    });

    return {
      output: {
        orderId: ctx.input.orderId,
        shipmentsAdded: ctx.input.shipments.length
      },
      message: `Fulfilled order **${ctx.input.orderId}** with **${ctx.input.shipments.length}** shipment(s).${ctx.input.shouldSendNotification ? ' Customer notification sent.' : ''}`
    };
  })
  .build();
