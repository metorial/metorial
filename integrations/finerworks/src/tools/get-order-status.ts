import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requiredArray, requiredNumber, requiredString } from '../lib/client';
import { spec } from '../spec';

let shipmentSchema = z.object({
  shipmentDate: z.string().nullable().optional().describe('Date the shipment was dispatched'),
  deliveryDate: z.string().nullable().optional().describe('Date the shipment was delivered'),
  weight: z.number().nullable().optional().describe('Shipment weight in ounces'),
  width: z.number().nullable().optional().describe('Package width'),
  height: z.number().nullable().optional().describe('Package height'),
  depth: z.number().nullable().optional().describe('Package depth'),
  trackingNumber: z.string().nullable().optional().describe('Shipping tracking number'),
  trackingUrl: z.string().nullable().optional().describe('URL to track the shipment'),
  carrier: z.string().nullable().optional().describe('Shipping carrier name')
});

export let getOrderStatus = SlateTool.create(spec, {
  name: 'Get Order Status',
  key: 'get_order_status',
  description: `Retrieve the current production status for one or more orders, including shipment details such as tracking numbers, dates, and dimensions. Look up orders by their order IDs or purchase order references.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderIds: z
        .array(z.number())
        .optional()
        .describe('Order IDs to look up (from order submission response)'),
      orderPos: z.array(z.string()).optional().describe('Purchase order references to look up')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response'),
      orders: z
        .array(
          z.object({
            orderId: z.number().describe('FinerWorks order ID'),
            orderPo: z.string().describe('Purchase order reference'),
            orderConfirmationId: z
              .number()
              .optional()
              .describe('Confirmation reference number'),
            orderStatusId: z.number().describe('Numeric status ID'),
            orderStatusLabel: z.string().describe('Human-readable status description'),
            shipments: z.array(shipmentSchema).optional().describe('Shipment details')
          })
        )
        .describe('Order statuses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let data = await client.fetchOrderStatus({
      orderIds: ctx.input.orderIds,
      orderPos: ctx.input.orderPos
    });

    let orders = requiredArray(data.orders, 'orders').map((o: any) => ({
      orderId: requiredNumber(o.order_id, 'order_id'),
      orderPo: requiredString(o.order_po, 'order_po'),
      orderConfirmationId: o.order_confirmation_id ?? undefined,
      orderStatusId: requiredNumber(o.order_status_id, 'order_status_id'),
      orderStatusLabel: requiredString(o.order_status_label, 'order_status_label'),
      shipments: o.shipments?.map((s: any) => ({
        shipmentDate: s.shipment_date ?? null,
        deliveryDate: s.delivery_date ?? null,
        weight: s.weight ?? null,
        width: s.width ?? null,
        height: s.height ?? null,
        depth: s.depth ?? null,
        trackingNumber: s.tracking_number ?? null,
        trackingUrl: s.tracking_url ?? null,
        carrier: s.carrier ?? null
      }))
    }));

    return {
      output: { orders, raw: data },
      message: `Retrieved status for **${orders.length}** order(s). ${orders.map((o: any) => `Order \`${o.orderPo}\` (ID: ${o.orderId}): **${o.orderStatusLabel}**`).join('; ')}`
    };
  })
  .build();
