import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let registerTracking = SlateTool.create(spec, {
  name: 'Register Tracking Webhook',
  key: 'register_tracking',
  description: `Register a tracking number for webhook-based updates. Once registered, Shippo will send tracking status changes to your configured webhook endpoint. You must have a tracking webhook configured before calling this.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      carrier: z.string().describe('Carrier token (e.g. usps, fedex, ups, dhl_express)'),
      trackingNumber: z.string().describe('Carrier tracking number'),
      metadata: z
        .string()
        .optional()
        .describe('Custom metadata to attach to the tracking request')
    })
  )
  .output(
    z.object({
      carrier: z.string().optional(),
      trackingNumber: z.string().optional(),
      currentStatus: z.string().optional().describe('Current tracking status'),
      metadata: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = (await client.registerTrackingWebhook({
      carrier: ctx.input.carrier,
      tracking_number: ctx.input.trackingNumber,
      metadata: ctx.input.metadata
    })) as Record<string, any>;

    return {
      output: {
        carrier: result.carrier,
        trackingNumber: result.tracking_number,
        currentStatus: result.tracking_status?.status,
        metadata: result.metadata
      },
      message: `Registered tracking for **${ctx.input.trackingNumber}** (${ctx.input.carrier}). Current status: **${result.tracking_status?.status || 'UNKNOWN'}**.`
    };
  })
  .build();
