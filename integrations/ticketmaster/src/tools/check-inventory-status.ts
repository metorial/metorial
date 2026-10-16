import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { InventoryStatusClient } from '../lib/client';
import { parseTicketmasterOutput } from '../lib/output';
import { spec } from '../spec';

let priceRangeSchema = z
  .object({
    min: z.number().nullable(),
    max: z.number().nullable(),
    currency: z.string(),
    listingsExtendBeyondMax: z.boolean().optional()
  })
  .nullable();

let eventAvailabilitySchema = z.object({
  eventId: z.string(),
  status: z
    .string()
    .describe(
      'Primary inventory status: TICKETS_AVAILABLE, FEW_TICKETS_LEFT, TICKETS_NOT_AVAILABLE, UNKNOWN'
    ),
  primaryStatus: z.string(),
  resaleStatus: z.string(),
  primaryPriceRange: priceRangeSchema,
  resalePriceRange: priceRangeSchema,
  statusDetail: z.string().optional(),
  resaleStatusDetail: z.string().optional()
});

let price = (value: unknown) => {
  if (value === undefined || value === null) return null;
  let numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(numeric)) {
    throw createApiServiceError('Ticketmaster returned an invalid inventory price.', {
      reason: 'invalid_inventory_response'
    });
  }
  return numeric;
};

let priceRange = (event: Record<string, any>, type: 'primary' | 'resale') => {
  let documented = Array.isArray(event.priceRanges)
    ? event.priceRanges.find(
        (range: any) => typeof range?.type === 'string' && range.type.toLowerCase() === type
      )
    : undefined;
  let range = documented ?? event[type]?.priceRange ?? event[`${type}PriceRange`];
  if (!isApiErrorRecord(range)) return null;
  return {
    min: price(range.minPrice ?? range.min),
    max: price(range.maxPrice ?? range.max),
    currency: range.currency ?? event.currency ?? undefined,
    listingsExtendBeyondMax:
      typeof range.listingsExtendBeyondMax === 'boolean'
        ? range.listingsExtendBeyondMax
        : undefined
  };
};

let outputSchema = z.object({ events: z.array(eventAvailabilitySchema) });

export let checkInventoryStatusTool = SlateTool.create(spec, {
  name: 'Check Inventory Status',
  key: 'check_inventory_status',
  description:
    'Check near real-time primary and resale ticket availability for Ticketmaster events, with price ranges when available.',
  instructions: [
    'Batch only events from the same ticketing source and country. Mixing sources or countries can produce incorrect statuses.',
    'Prices are refreshed at most once per hour. A maximum price of 2000 with listingsExtendBeyondMax=true means higher-priced inventory exists.'
  ],
  constraints: [
    'Requires separately authorized Inventory Status API access.',
    'The event ID list must fit within the 7 KB request limit (approximately 350 IDs). Price ranges depend on market support.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventIds: z
        .array(z.string())
        .min(1)
        .describe('Universal event IDs from a single ticketing source and country')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new InventoryStatusClient({ token: ctx.auth.token });
    let response = await client.getAvailability(ctx.input.eventIds);
    let rawEvents = Array.isArray(response) ? response : response?.events;
    if (!Array.isArray(rawEvents)) {
      throw createApiServiceError('Ticketmaster returned an invalid inventory response.', {
        reason: 'invalid_inventory_response'
      });
    }
    let events = rawEvents.map((event: any) => {
      let eventId = event?.eventId ?? event?.eventid ?? event?.id;
      let status = event?.status ?? event?.primary?.status ?? event?.primaryStatus;
      if (
        !isApiErrorRecord(event) ||
        typeof eventId !== 'string' ||
        typeof status !== 'string'
      ) {
        throw createApiServiceError(
          'Ticketmaster returned an inventory item without its event ID or status.',
          { reason: 'invalid_inventory_response' }
        );
      }
      let eventData: Record<string, any> = event;
      return {
        eventId,
        status,
        primaryStatus: eventData.primary?.status ?? eventData.primaryStatus ?? status,
        resaleStatus: eventData.resaleStatus ?? eventData.resale?.status ?? undefined,
        primaryPriceRange: priceRange(eventData, 'primary'),
        resalePriceRange: priceRange(eventData, 'resale'),
        statusDetail: eventData.statusDetail ?? undefined,
        resaleStatusDetail: eventData.resaleStatusDetail ?? undefined
      };
    });
    let availableCount = events.filter(event =>
      ['TICKETS_AVAILABLE', 'FEW_TICKETS_LEFT', 'available', 'limited'].includes(event.status)
    ).length;
    return {
      output: parseTicketmasterOutput(outputSchema, { events }, 'check-inventory-status'),
      message: `Checked **${events.length}** events: **${availableCount}** have primary tickets available.`
    };
  })
  .build();
