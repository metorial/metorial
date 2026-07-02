import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let venueSchema = z.object({
  venueId: z.number().describe('Unique venue ID'),
  name: z.string().describe('Venue name'),
  url: z.string().describe('SeatGeek URL for the venue'),
  score: z.number().describe('Popularity score from 0 to 1'),
  address: z.string().describe('Street address'),
  extendedAddress: z.string().describe('Extended address (suite, floor, etc.)'),
  city: z.string().describe('City'),
  state: z.string().describe('State'),
  country: z.string().describe('Country'),
  postalCode: z.string().describe('Postal code'),
  latitude: z.number().describe('Latitude coordinate'),
  longitude: z.number().describe('Longitude coordinate'),
  timezone: z.string().describe('IANA timezone identifier'),
  slug: z.string().describe('URL-friendly venue identifier'),
  capacity: z.number().describe('Venue capacity'),
  displayLocation: z.string().describe('Human-readable location string'),
  numUpcomingEvents: z.number().describe('Number of upcoming events at this venue'),
  hasUpcomingEvents: z.boolean().describe('Whether the venue has upcoming events')
});

export let searchVenues = SlateTool.create(spec, {
  name: 'Search Venues',
  key: 'search_venues',
  description: `Search for venues on SeatGeek including stadiums, arenas, theaters, and more. Filter by location, name, or geolocation. Returns venue details with address, coordinates, capacity, and upcoming event counts.`,
  instructions: [
    'Use the "query" parameter for natural language searches like "Madison Square Garden" or "stadiums in Chicago".',
    'Filter by city, state, or country using the respective parameters.',
    'For geolocation-based search, provide postalCode, geoIp, or latitude/longitude.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Full-text search query (e.g., "Madison Square Garden")'),
      city: z.string().optional().describe('Filter by city name'),
      state: z.string().optional().describe('Filter by state (two-letter abbreviation)'),
      country: z.string().optional().describe('Filter by country (two-letter code)'),
      postalCode: z.string().optional().describe('Filter by postal code'),
      latitude: z.number().optional().describe('Filter by latitude (requires longitude)'),
      longitude: z.number().optional().describe('Filter by longitude (requires latitude)'),
      geoIp: z
        .string()
        .optional()
        .describe('Filter by IP address, or "true" to use client IP'),
      range: z
        .string()
        .optional()
        .describe('Search radius for geolocation (e.g., "30mi", "50km")'),
      page: z.number().optional().describe('Page number (1-indexed). Default: 1'),
      perPage: z.number().optional().describe('Results per page. Default: 10')
    })
  )
  .output(
    z.object({
      venues: z.array(venueSchema).describe('List of matching venues'),
      total: z.number().describe('Total number of matching venues'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      affiliateId: ctx.config.affiliateId,
      referralId: ctx.config.referralId
    });

    let params: Record<string, string> = {};

    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.city) params.city = ctx.input.city;
    if (ctx.input.state) params.state = ctx.input.state;
    if (ctx.input.country) params.country = ctx.input.country;
    if (ctx.input.postalCode) params.postal_code = ctx.input.postalCode;
    if (ctx.input.latitude) params.lat = String(ctx.input.latitude);
    if (ctx.input.longitude) params.lon = String(ctx.input.longitude);
    if (ctx.input.geoIp) params.geoip = ctx.input.geoIp;
    if (ctx.input.range) params.range = ctx.input.range;
    if (ctx.input.page) params.page = String(ctx.input.page);
    if (ctx.input.perPage) params.per_page = String(ctx.input.perPage);

    let response = await client.searchVenues(params);

    let venues = response.venues.map(v => ({
      venueId: v.id,
      name: v.name,
      url: v.url,
      score: v.score,
      address: v.address,
      extendedAddress: v.extended_address,
      city: v.city,
      state: v.state,
      country: v.country,
      postalCode: v.postal_code,
      latitude: v.location.lat,
      longitude: v.location.lon,
      timezone: v.timezone,
      slug: v.slug,
      capacity: v.capacity,
      displayLocation: v.display_location,
      numUpcomingEvents: v.num_upcoming_events,
      hasUpcomingEvents: v.has_upcoming_events
    }));

    let total = response.meta.total;
    let page = response.meta.page;
    let perPage = response.meta.per_page;

    let summaryParts = [`Found **${total}** venue(s)`];
    if (ctx.input.query) summaryParts.push(`matching "${ctx.input.query}"`);
    summaryParts.push(`(page ${page}, showing ${venues.length} of ${total})`);

    if (venues.length > 0) {
      summaryParts.push('\n\nTop results:');
      for (let v of venues.slice(0, 5)) {
        summaryParts.push(
          `- **${v.name}** — ${v.displayLocation}${v.capacity ? ` (capacity: ${v.capacity.toLocaleString()})` : ''}`
        );
      }
    }

    return {
      output: { venues, total, page, perPage },
      message: summaryParts.join('\n')
    };
  })
  .build();
