import { SlateTool } from 'slates';
import { z } from 'zod';
import { InventoryStatusClient } from '../lib/client';
import { spec } from '../spec';

let eventAvailabilitySchema = z.object({
  eventId: z.string(),
  status: z.string().describe('Availability status: available, not_available, limited'),
  primaryStatus: z.string(),
  resaleStatus: z.string(),
  primaryPriceRange: z
    .object({
      min: z.number().nullable(),
      max: z.number().nullable(),
      currency: z.string()
    })
    .nullable(),
  resalePriceRange: z
    .object({
      min: z.number().nullable(),
      max: z.number().nullable(),
      currency: z.string()
    })
    .nullable()
});

export let checkInventoryStatusTool = SlateTool.create(spec, {
  name: 'Check Inventory Status',
  key: 'check_inventory_status',
  description: `Check real-time ticket availability status for one or more Ticketmaster events. Returns primary and resale inventory status along with price ranges. Updates happen near real-time. Supports querying multiple events in a single request.`,
  instructions: [
    'Price ranges are currently only available for US, CA, AU, NZ, and MX markets.'
  ],
  constraints: [
    'This API requires authorized access. Contact devportalinquiry@ticketmaster.com for access.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventIds: z
        .array(z.string())
        .min(1)
        .describe('One or more Ticketmaster event IDs to check')
    })
  )
  .output(
    z.object({
      events: z.array(eventAvailabilitySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new InventoryStatusClient({
      token: ctx.auth.token
    });

    let response = await client.getAvailability(ctx.input.eventIds);

    let rawEvents = Array.isArray(response) ? response : response?.events || [];
    let events = rawEvents.map((e: any) => ({
      eventId: e.eventId || e.id || '',
      status: e.status || '',
      primaryStatus: e.primary?.status || e.primaryStatus || '',
      resaleStatus: e.resale?.status || e.resaleStatus || '',
      primaryPriceRange:
        e.primary?.priceRange || e.primaryPriceRange
          ? {
              min: e.primary?.priceRange?.min ?? e.primaryPriceRange?.min ?? null,
              max: e.primary?.priceRange?.max ?? e.primaryPriceRange?.max ?? null,
              currency: e.primary?.priceRange?.currency ?? e.primaryPriceRange?.currency ?? ''
            }
          : null,
      resalePriceRange:
        e.resale?.priceRange || e.resalePriceRange
          ? {
              min: e.resale?.priceRange?.min ?? e.resalePriceRange?.min ?? null,
              max: e.resale?.priceRange?.max ?? e.resalePriceRange?.max ?? null,
              currency: e.resale?.priceRange?.currency ?? e.resalePriceRange?.currency ?? ''
            }
          : null
    }));

    let availableCount = events.filter(
      (e: any) => e.status === 'available' || e.primaryStatus === 'available'
    ).length;

    return {
      output: { events },
      message: `Checked **${events.length}** events: **${availableCount}** available.`
    };
  })
  .build();
