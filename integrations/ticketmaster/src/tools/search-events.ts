import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiscoveryClient } from '../lib/client';
import { mapEvent, mapPagination } from '../lib/mappers';
import { spec } from '../spec';

let imageSchema = z.object({
  url: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  ratio: z.string()
});

let classificationSchema = z.object({
  primary: z.boolean(),
  segmentName: z.string(),
  segmentId: z.string(),
  genreName: z.string(),
  genreId: z.string(),
  subGenreName: z.string(),
  subGenreId: z.string(),
  typeName: z.string(),
  subTypeName: z.string()
});

let priceRangeSchema = z.object({
  type: z.string(),
  currency: z.string(),
  min: z.number().nullable(),
  max: z.number().nullable()
});

let venueSchema = z
  .object({
    venueId: z.string(),
    name: z.string(),
    url: z.string(),
    city: z.string(),
    stateCode: z.string(),
    stateName: z.string(),
    countryCode: z.string(),
    countryName: z.string(),
    postalCode: z.string(),
    address: z.string(),
    latitude: z.string(),
    longitude: z.string(),
    timezone: z.string()
  })
  .nullable();

let attractionSummarySchema = z.object({
  attractionId: z.string(),
  name: z.string(),
  url: z.string(),
  classifications: z.array(
    z.object({
      segmentName: z.string(),
      genreName: z.string()
    })
  )
});

let eventSchema = z.object({
  eventId: z.string().describe('Unique Ticketmaster event ID'),
  name: z.string(),
  type: z.string(),
  url: z.string().describe('Direct URL to purchase tickets'),
  locale: z.string(),
  description: z.string(),
  pleaseNote: z.string(),
  startDate: z.string(),
  startLocalDate: z.string(),
  startLocalTime: z.string(),
  startDateTBD: z.boolean(),
  startDateTBA: z.boolean(),
  startTimeTBA: z.boolean(),
  endDate: z.string(),
  timezone: z.string(),
  statusCode: z
    .string()
    .describe('Event status: onsale, offsale, canceled, postponed, rescheduled'),
  spanMultipleDays: z.boolean(),
  priceRanges: z.array(priceRangeSchema),
  seatmap: z.string().describe('URL to static seatmap image'),
  ticketLimit: z.string(),
  ageRestrictions: z.boolean(),
  accessibility: z.string(),
  images: z.array(imageSchema),
  sales: z.object({
    publicStartDateTime: z.string(),
    publicEndDateTime: z.string(),
    publicStartTBD: z.boolean(),
    presales: z.array(
      z.object({
        name: z.string(),
        startDateTime: z.string(),
        endDateTime: z.string()
      })
    )
  }),
  classifications: z.array(classificationSchema),
  promoter: z
    .object({
      promoterId: z.string(),
      name: z.string(),
      description: z.string()
    })
    .nullable(),
  venue: venueSchema,
  attractions: z.array(attractionSummarySchema)
});

let paginationSchema = z.object({
  totalElements: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
  pageSize: z.number()
});

export let searchEventsTool = SlateTool.create(spec, {
  name: 'Search Events',
  key: 'search_events',
  description: `Search for live events across Ticketmaster, Universe, FrontGate Tickets and TMR platforms. Filter by keyword, location, date range, classification (segment/genre), attraction, venue, and more. Returns event details including dates, pricing, venues, and purchase URLs.`,
  instructions: [
    'Date/time filters use ISO 8601 format with timezone: YYYY-MM-DDTHH:mm:ssZ (e.g., 2025-01-01T00:00:00Z)',
    'Use countryCode (e.g., US, CA, GB) to filter by country. Use stateCode for US/CA states.',
    'Use latlong with radius for proximity search (e.g., latlong "34.0522,-118.2437" with radius "50" and unit "miles")',
    'Sort options: name,asc | name,desc | date,asc | date,desc | relevance,asc | relevance,desc | distance,asc | distance,desc | onSaleStartDate,asc'
  ],
  constraints: [
    'Maximum page size is 200 events per request.',
    'Rate limited to 5 requests per second with the default API key tier.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z
        .string()
        .optional()
        .describe('Search keyword to match against event name, venue, or attraction'),
      attractionId: z.string().optional().describe('Filter by attraction ID'),
      venueId: z.string().optional().describe('Filter by venue ID'),
      classificationName: z
        .string()
        .optional()
        .describe('Filter by classification name (e.g., "Music", "Sports", "Arts & Theatre")'),
      segmentId: z.string().optional().describe('Filter by segment ID'),
      segmentName: z.string().optional().describe('Filter by segment name'),
      genreId: z.string().optional().describe('Filter by genre ID'),
      subGenreId: z.string().optional().describe('Filter by sub-genre ID'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO country code (e.g., US, CA, GB, AU, MX, NZ)'),
      stateCode: z.string().optional().describe('State/province code (e.g., CA, NY, ON)'),
      city: z.string().optional().describe('City name'),
      postalCode: z.string().optional().describe('Postal/zip code'),
      dmaId: z.string().optional().describe('DMA (Designated Market Area) ID'),
      latlong: z
        .string()
        .optional()
        .describe('Latitude,longitude for geo search (e.g., "34.0522,-118.2437")'),
      radius: z.string().optional().describe('Radius for geo search (used with latlong)'),
      unit: z
        .string()
        .optional()
        .describe('Unit for radius: "miles" or "km" (default: miles)'),
      startDateTime: z
        .string()
        .optional()
        .describe('Start date/time filter in ISO 8601 UTC (e.g., 2025-01-01T00:00:00Z)'),
      endDateTime: z.string().optional().describe('End date/time filter in ISO 8601 UTC'),
      source: z
        .string()
        .optional()
        .describe('Source platform filter: ticketmaster, universe, frontgate, tmr'),
      sort: z
        .string()
        .optional()
        .describe('Sort order (e.g., date,asc | name,asc | relevance,desc | distance,asc)'),
      size: z.number().optional().describe('Number of results per page (default 20, max 200)'),
      page: z.number().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscoveryClient({
      token: ctx.auth.token,
      countryCode: ctx.config.countryCode,
      locale: ctx.config.locale
    });

    let response = await client.searchEvents({
      keyword: ctx.input.keyword,
      attractionId: ctx.input.attractionId,
      venueId: ctx.input.venueId,
      classificationName: ctx.input.classificationName,
      segmentId: ctx.input.segmentId,
      segmentName: ctx.input.segmentName,
      genreId: ctx.input.genreId,
      subGenreId: ctx.input.subGenreId,
      countryCode: ctx.input.countryCode,
      stateCode: ctx.input.stateCode,
      city: ctx.input.city,
      postalCode: ctx.input.postalCode,
      dmaId: ctx.input.dmaId,
      latlong: ctx.input.latlong,
      radius: ctx.input.radius,
      unit: ctx.input.unit,
      startDateTime: ctx.input.startDateTime,
      endDateTime: ctx.input.endDateTime,
      source: ctx.input.source,
      sort: ctx.input.sort,
      size: ctx.input.size,
      page: ctx.input.page
    });

    let rawEvents = response?._embedded?.events || [];
    let events = rawEvents.map(mapEvent).filter(Boolean);
    let pagination = mapPagination(response?.page);

    return {
      output: { events, pagination },
      message: `Found **${pagination.totalElements}** events (showing page ${pagination.currentPage + 1} of ${pagination.totalPages}).`
    };
  })
  .build();
