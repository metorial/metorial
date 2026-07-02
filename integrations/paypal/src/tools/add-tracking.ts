import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

export let addTracking = SlateTool.create(spec, {
  name: 'Add Tracking',
  key: 'add_tracking',
  description: `Add shipment tracking information to a captured PayPal payment or order. Uses Orders v2 tracking when an order ID is provided and falls back to legacy transaction tracking otherwise.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      captureId: z.string().describe('PayPal capture/transaction ID to add tracking to'),
      orderId: z
        .string()
        .optional()
        .describe(
          'PayPal order ID. Provide this to add tracking through the current Orders v2 API.'
        ),
      trackingNumber: z.string().describe('Carrier tracking number'),
      carrier: z.string().describe('Shipping carrier (e.g. FEDEX, UPS, USPS, DHL)'),
      carrierNameOther: z
        .string()
        .optional()
        .describe('Carrier display name when carrier is OTHER'),
      status: z
        .enum(['SHIPPED', 'ON_HOLD', 'DELIVERED', 'CANCELLED', 'LOCAL_PICKUP'])
        .optional()
        .describe('Shipment status for legacy transaction tracking. Defaults to SHIPPED.'),
      notifyPayer: z
        .boolean()
        .optional()
        .describe('Whether to email tracking info to the buyer. Defaults to false.'),
      items: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Order item details for Orders v2 tracking')
    })
  )
  .output(
    z.object({
      trackerId: z
        .string()
        .optional()
        .describe('Tracker ID in format transactionId-trackingNumber'),
      status: z.string().optional().describe('Tracking status'),
      trackingNumber: z.string().describe('Tracking number'),
      carrier: z.string().describe('Carrier name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let result = ctx.input.orderId
      ? await client.addOrderTracking(ctx.input.orderId, {
          captureId: ctx.input.captureId,
          trackingNumber: ctx.input.trackingNumber,
          carrier: ctx.input.carrier,
          carrierNameOther: ctx.input.carrierNameOther,
          notifyPayer: ctx.input.notifyPayer,
          items: ctx.input.items
        })
      : await client.addTracking(ctx.input.captureId, {
          trackingNumber: ctx.input.trackingNumber,
          carrier: ctx.input.carrier,
          status: ctx.input.status,
          notifyPayer: ctx.input.notifyPayer
        });

    let orderTracker = (result.purchase_units as any[])?.[0]?.shipping?.trackers?.[0];
    let tracker = orderTracker || (result.tracker_identifiers || result.trackers)?.[0] || {};

    return {
      output: {
        trackerId:
          tracker.id ||
          tracker.tracking_number_id ||
          `${ctx.input.captureId}-${ctx.input.trackingNumber}`,
        status: tracker.status || ctx.input.status || 'SHIPPED',
        trackingNumber: ctx.input.trackingNumber,
        carrier: ctx.input.carrier
      },
      message: `Tracking added for capture \`${ctx.input.captureId}\`: ${ctx.input.carrier} ${ctx.input.trackingNumber}.`
    };
  })
  .build();
