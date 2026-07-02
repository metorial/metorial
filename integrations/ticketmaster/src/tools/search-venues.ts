import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiscoveryClient } from '../lib/client';
import { mapPagination, mapVenue } from '../lib/mappers';
import { spec } from '../spec';

let venueSchema = z.object({
  venueId: z.string().describe('Unique Ticketmaster venue ID'),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  locale: z.string(),
  city: z.string(),
  stateCode: z.string(),
  stateName: z.string(),
  countryCode: z.string(),
  countryName: z.string(),
  postalCode: z.string(),
  address: z.string(),
  addressLine2: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  timezone: z.string(),
  parkingDetail: z.string(),
  accessibleSeatingDetail: z.string(),
  generalInfo: z.object({
    generalRule: z.string(),
    childRule: z.string()
  }),
  boxOfficeInfo: z.object({
    phoneNumberDetail: z.string(),
    openHoursDetail: z.string(),
    acceptedPaymentDetail: z.string(),
    willCallDetail: z.string()
  }),
  upcomingEvents: z.record(z.string(), z.any()),
  images: z.array(
    z.object({
      url: z.string(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      ratio: z.string()
    })
  ),
  dmas: z.array(z.object({ dmaId: z.string() })),
  social: z.record(z.string(), z.any())
});

export let searchVenuesTool = SlateTool.create(spec, {
  name: 'Search Venues',
  key: 'search_venues',
  description: `Search for venues on Ticketmaster. Filter by keyword, location (country, state, city, postal code), or geographic coordinates. Returns venue details including address, box office info, general rules, and upcoming event counts.`,
  instructions: [
    'Use latlong with radius for proximity search (e.g., latlong "40.7128,-74.0060" with radius "25" unit "miles")',
    'Sort options: name,asc | name,desc | relevance,asc | relevance,desc | distance,asc | distance,desc'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().optional().describe('Search keyword to match against venue name'),
      countryCode: z.string().optional().describe('ISO country code (e.g., US, CA, GB)'),
      stateCode: z.string().optional().describe('State/province code (e.g., CA, NY, ON)'),
      city: z.string().optional().describe('City name'),
      postalCode: z.string().optional().describe('Postal/zip code'),
      latlong: z
        .string()
        .optional()
        .describe('Latitude,longitude for geo search (e.g., "40.7128,-74.0060")'),
      radius: z.string().optional().describe('Radius for geo search'),
      unit: z.string().optional().describe('Unit for radius: "miles" or "km"'),
      source: z
        .string()
        .optional()
        .describe('Source platform: ticketmaster, universe, frontgate, tmr'),
      sort: z.string().optional().describe('Sort order'),
      size: z.number().optional().describe('Number of results per page (default 20, max 200)'),
      page: z.number().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      venues: z.array(venueSchema),
      pagination: z.object({
        totalElements: z.number(),
        totalPages: z.number(),
        currentPage: z.number(),
        pageSize: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscoveryClient({
      token: ctx.auth.token,
      countryCode: ctx.config.countryCode,
      locale: ctx.config.locale
    });

    let response = await client.searchVenues({
      keyword: ctx.input.keyword,
      countryCode: ctx.input.countryCode,
      stateCode: ctx.input.stateCode,
      city: ctx.input.city,
      postalCode: ctx.input.postalCode,
      latlong: ctx.input.latlong,
      radius: ctx.input.radius,
      unit: ctx.input.unit,
      source: ctx.input.source,
      sort: ctx.input.sort,
      size: ctx.input.size,
      page: ctx.input.page
    });

    let rawVenues = response?._embedded?.venues || [];
    let venues = rawVenues.map(mapVenue).filter(Boolean);
    let pagination = mapPagination(response?.page);

    return {
      output: { venues, pagination },
      message: `Found **${pagination.totalElements}** venues (showing page ${pagination.currentPage + 1} of ${pagination.totalPages}).`
    };
  })
  .build();
