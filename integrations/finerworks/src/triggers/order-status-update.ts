import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let orderStatusUpdate = SlateTrigger.create(spec, {
  name: 'Order Status Update',
  key: 'order_status_update',
  description:
    "Triggered when an order's production status changes. Receives webhook notifications configured per-order via the webhook_order_status_url field during order submission."
})
  .input(
    z.object({
      orderId: z.number().describe('FinerWorks order ID'),
      orderPo: z.string().optional().describe('Purchase order reference'),
      orderConfirmationId: z.number().optional().describe('Order confirmation ID'),
      orderStatusId: z.number().optional().describe('New status ID'),
      orderStatusLabel: z.string().optional().describe('New status label'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('FinerWorks order ID'),
      orderPo: z.string().optional().describe('Purchase order reference'),
      orderConfirmationId: z.number().optional().describe('Order confirmation ID'),
      orderStatusId: z.number().optional().describe('Numeric status ID'),
      orderStatusLabel: z.string().optional().describe('Human-readable status label'),
      shipments: z
        .array(
          z.object({
            shipmentDate: z
              .string()
              .nullable()
              .optional()
              .describe('Date shipment was dispatched'),
            deliveryDate: z.string().nullable().optional().describe('Date of delivery'),
            trackingNumber: z.string().nullable().optional().describe('Tracking number'),
            trackingUrl: z.string().nullable().optional().describe('Tracking URL'),
            carrier: z.string().nullable().optional().describe('Shipping carrier'),
            weight: z.number().nullable().optional().describe('Package weight')
          })
        )
        .optional()
        .describe('Shipment details if the order has shipped')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Handle both single event and array payloads
      let events = Array.isArray(data) ? data : [data];

      let inputs = events
        .filter((e: any) => e && (e.order_id || e.orderId))
        .map((e: any) => ({
          orderId: e.order_id ?? e.orderId ?? 0,
          orderPo: e.order_po ?? e.orderPo ?? undefined,
          orderConfirmationId: e.order_confirmation_id ?? e.orderConfirmationId ?? undefined,
          orderStatusId: e.order_status_id ?? e.orderStatusId ?? undefined,
          orderStatusLabel: e.order_status_label ?? e.orderStatusLabel ?? undefined,
          rawPayload: e
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      // Try to fetch additional details if we have auth and an order ID
      let shipments: any[] | undefined;
      try {
        let client = new Client({
          webApiKey: ctx.auth.webApiKey,
          appKey: ctx.auth.appKey
        });

        let statusData = await client.fetchOrderStatus({ orderIds: [input.orderId] });
        if (statusData.status?.success && statusData.orders?.length > 0) {
          let order = statusData.orders[0];
          // Enrich with fetched data if webhook payload was sparse
          if (!input.orderPo && order.order_po) input = { ...input, orderPo: order.order_po };
          if (!input.orderStatusId && order.order_status_id)
            input = { ...input, orderStatusId: order.order_status_id };
          if (!input.orderStatusLabel && order.order_status_label)
            input = { ...input, orderStatusLabel: order.order_status_label };
          if (!input.orderConfirmationId && order.order_confirmation_id)
            input = { ...input, orderConfirmationId: order.order_confirmation_id };

          shipments = (order.shipments ?? []).map((s: any) => ({
            shipmentDate: s.shipment_date ?? null,
            deliveryDate: s.delivery_date ?? null,
            trackingNumber: s.tracking_number ?? null,
            trackingUrl: s.tracking_url ?? null,
            carrier: s.carrier ?? null,
            weight: s.weight ?? null
          }));
        }
      } catch {
        // If enrichment fails, continue with what we have from the webhook payload
      }

      return {
        type: 'order.status_updated',
        id: `${input.orderId}-${input.orderStatusId ?? 'unknown'}-${Date.now()}`,
        output: {
          orderId: input.orderId,
          orderPo: input.orderPo,
          orderConfirmationId: input.orderConfirmationId,
          orderStatusId: input.orderStatusId,
          orderStatusLabel: input.orderStatusLabel,
          shipments
        }
      };
    }
  })
  .build();
