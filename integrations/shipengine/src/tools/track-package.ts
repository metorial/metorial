import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let trackingEventSchema = z.object({
  occurredAt: z.string().describe('When the event occurred'),
  description: z.string().describe('Event description'),
  cityLocality: z.string().optional().describe('City where event occurred'),
  stateProvince: z.string().optional().describe('State where event occurred'),
  postalCode: z.string().optional().describe('Postal code'),
  countryCode: z.string().optional().describe('Country code'),
  companyName: z.string().optional().describe('Facility or company name'),
  signer: z.string().optional().describe('Name of person who signed for the package'),
  statusCode: z.string().optional().describe('Event status code'),
  statusDescription: z.string().optional().describe('Event status description')
});

export let trackPackage = SlateTool.create(spec, {
  name: 'Track Package',
  key: 'track_package',
  description: `Get the current tracking status and full event history for a package. Track by **carrier code + tracking number**, or by **ShipEngine label ID**. Returns status, estimated/actual delivery dates, and a chronological event history.`,
  instructions: ['Provide either labelId OR both carrierCode and trackingNumber.'],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      labelId: z.string().optional().describe('ShipEngine label ID to track'),
      carrierCode: z
        .string()
        .optional()
        .describe('Carrier code (e.g. fedex, ups, usps, dhl_express)'),
      trackingNumber: z.string().optional().describe('Carrier tracking number')
    })
  )
  .output(
    z.object({
      trackingNumber: z.string().describe('Tracking number'),
      trackingUrl: z.string().optional().describe('Carrier tracking URL'),
      statusCode: z.string().describe('Current status code (e.g. IT, DE, AC, EX, UN, AT)'),
      statusDescription: z.string().describe('Human-readable status'),
      carrierCode: z.string().optional().describe('Carrier code'),
      carrierStatusCode: z.string().optional().describe('Carrier-specific status code'),
      carrierStatusDescription: z
        .string()
        .optional()
        .describe('Carrier-specific status description'),
      shipDate: z.string().optional().describe('Ship date'),
      estimatedDeliveryDate: z.string().optional().describe('Estimated delivery date'),
      actualDeliveryDate: z.string().optional().describe('Actual delivery date'),
      exceptionDescription: z
        .string()
        .optional()
        .describe('Exception description if there is an issue'),
      events: z.array(trackingEventSchema).describe('Chronological list of tracking events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let tracking: any;

    if (ctx.input.labelId) {
      tracking = await client.getLabelTrackingInfo(ctx.input.labelId);
    } else if (ctx.input.carrierCode && ctx.input.trackingNumber) {
      tracking = await client.getTrackingInfo(ctx.input.carrierCode, ctx.input.trackingNumber);
    } else {
      throw new Error('Provide either labelId, or both carrierCode and trackingNumber.');
    }

    let events = tracking.events.map((e: any) => ({
      occurredAt: e.occurred_at,
      description: e.description,
      cityLocality: e.city_locality,
      stateProvince: e.state_province,
      postalCode: e.postal_code,
      countryCode: e.country_code,
      companyName: e.company_name,
      signer: e.signer,
      statusCode: e.status_code,
      statusDescription: e.status_description
    }));

    return {
      output: {
        trackingNumber: tracking.tracking_number,
        trackingUrl: tracking.tracking_url,
        statusCode: tracking.status_code,
        statusDescription: tracking.status_description,
        carrierCode: tracking.carrier_code,
        carrierStatusCode: tracking.carrier_status_code,
        carrierStatusDescription: tracking.carrier_status_description,
        shipDate: tracking.ship_date,
        estimatedDeliveryDate: tracking.estimated_delivery_date,
        actualDeliveryDate: tracking.actual_delivery_date,
        exceptionDescription: tracking.exception_description,
        events
      },
      message: `Package **${tracking.tracking_number}**: **${tracking.status_description}**${tracking.estimated_delivery_date ? ` — Est. delivery: ${tracking.estimated_delivery_date}` : ''}${tracking.actual_delivery_date ? ` — Delivered: ${tracking.actual_delivery_date}` : ''}`
    };
  })
  .build();
