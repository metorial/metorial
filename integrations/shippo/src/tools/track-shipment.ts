import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

let trackingEventSchema = z.object({
  status: z
    .string()
    .optional()
    .describe('Tracking status (PRE_TRANSIT, TRANSIT, DELIVERED, RETURNED, FAILURE, UNKNOWN)'),
  statusDetails: z.string().optional().describe('Detailed status description'),
  statusDate: z.string().optional().describe('Date and time of the tracking event'),
  location: z
    .object({
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional()
    })
    .optional()
    .describe('Location of the tracking event')
});

export let trackShipment = SlateTool.create(spec, {
  name: 'Track Shipment',
  key: 'track_shipment',
  description: `Get the current tracking status and full tracking history for a shipment. Provide a carrier token and tracking number. Works for any shipment, including those created outside of Shippo.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      carrier: z.string().describe('Carrier token (e.g. usps, fedex, ups, dhl_express)'),
      trackingNumber: z.string().describe('Carrier tracking number')
    })
  )
  .output(
    z.object({
      carrier: z.string().optional().describe('Carrier token'),
      trackingNumber: z.string().optional(),
      addressFrom: z.any().optional().describe('Origin location'),
      addressTo: z.any().optional().describe('Destination location'),
      eta: z.string().optional().describe('Estimated delivery date'),
      currentStatus: trackingEventSchema.optional().describe('Most recent tracking status'),
      trackingHistory: z
        .array(trackingEventSchema)
        .optional()
        .describe('Full tracking event history'),
      servicelevel: z.string().optional().describe('Service level name'),
      metadata: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = (await client.getTrackingStatus(
      ctx.input.carrier,
      ctx.input.trackingNumber
    )) as Record<string, any>;

    let mapEvent = (event: any) => ({
      status: event?.status,
      statusDetails: event?.status_details,
      statusDate: event?.status_date,
      location: event?.location
        ? {
            city: event.location.city,
            state: event.location.state,
            zip: event.location.zip,
            country: event.location.country
          }
        : undefined
    });

    return {
      output: {
        carrier: result.carrier,
        trackingNumber: result.tracking_number,
        addressFrom: result.address_from,
        addressTo: result.address_to,
        eta: result.eta,
        currentStatus: result.tracking_status ? mapEvent(result.tracking_status) : undefined,
        trackingHistory: (result.tracking_history || []).map(mapEvent),
        servicelevel: result.servicelevel?.name,
        metadata: result.metadata
      },
      message: `Tracking **${ctx.input.trackingNumber}** (${ctx.input.carrier}): **${result.tracking_status?.status || 'UNKNOWN'}** — ${result.tracking_status?.status_details || 'No details available'}.${result.eta ? ` ETA: ${result.eta}` : ''}`
    };
  })
  .build();
