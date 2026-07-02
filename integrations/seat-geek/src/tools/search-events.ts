import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  eventId: z.number().describe('Unique event ID'),
  title: z.string().describe('Full event title'),
  shortTitle: z.string().describe('Abbreviated event title'),
  url: z.string().describe('SeatGeek URL for viewing/purchasing tickets'),
  type: z.string().describe('Event type identifier'),
  datetimeLocal: z.string().describe('Event date/time in local timezone (ISO 8601)'),
  datetimeUtc: z.string().describe('Event date/time in UTC (ISO 8601)'),
  timeTbd: z.boolean().describe('Whether the event time is to be determined'),
  dateTbd: z.boolean().describe('Whether the event date is to be determined'),
  score: z.number().describe('Popularity score from 0 to 1'),
  venue: z
    .object({
      venueId: z.number().describe('Venue ID'),
      name: z.string().describe('Venue name'),
      city: z.string().describe('Venue city'),
      state: z.string().describe('Venue state'),
      country: z.string().describe('Venue country'),
      address: z.string().describe('Venue street address'),
      postalCode: z.string().describe('Venue postal code')
    })
    .describe('Venue where the event takes place'),
  performers: z
    .array(
      z.object({
        performerId: z.number().describe('Performer ID'),
        name: z.string().describe('Performer name'),
        shortName: z.string().describe('Abbreviated performer name'),
        type: z.string().describe('Performer type'),
        image: z.string().nullable().describe('Performer image URL'),
        primary: z.boolean().optional().describe('Whether this is the primary performer'),
        homeTeam: z.boolean().optional().describe('Whether this is the home team'),
        awayTeam: z.boolean().optional().describe('Whether this is the away team')
      })
    )
    .describe('Performers in the event'),
  taxonomies: z
    .array(
      z.object({
        taxonomyId: z.number().describe('Taxonomy ID'),
        name: z.string().describe('Taxonomy name')
      })
    )
    .describe('Event categories'),
  stats: z
    .object({
      listingCount: z.number().nullable().describe('Number of ticket listings'),
      averagePrice: z.number().nullable().describe('Average ticket price in USD'),
      lowestPrice: z.number().nullable().describe('Lowest ticket price in USD'),
      highestPrice: z.number().nullable().describe('Highest ticket price in USD'),
      medianPrice: z.number().nullable().describe('Median ticket price in USD')
    })
    .describe('Ticket pricing statistics')
});

export let searchEvents = SlateTool.create(spec, {
  name: 'Search Events',
  key: 'search_events',
  description: `Search for live events on SeatGeek including sports, concerts, theater, and more. Supports full-text search, filtering by performer, venue, location, date range, taxonomy, and ticket pricing. Returns event details with ticket price statistics and venue information.

**Note**: SeatGeek does not support purchasing tickets via API. Use the returned URL to direct users to SeatGeek for ticket purchases.`,
  instructions: [
    'Use the "query" parameter for natural language searches like "yankees march" or "concerts in new york".',
    'Date filters use ISO 8601 format (YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD). Combine dateFrom and dateTo for date ranges.',
    'For geolocation, provide either postalCode, geoIp (set to "true" for auto-detect), or both latitude and longitude.',
    'Events with timeTbd=true use a 3:30 AM sentinel value for time — the actual time has not been announced.'
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
        .describe('Full-text search query (e.g., "yankees march", "taylor swift")'),
      performerIds: z.array(z.number()).optional().describe('Filter by performer IDs'),
      performerSlugs: z.array(z.string()).optional().describe('Filter by performer slugs'),
      venueId: z.number().optional().describe('Filter by venue ID'),
      venueCity: z.string().optional().describe('Filter by venue city name'),
      venueState: z
        .string()
        .optional()
        .describe('Filter by venue state (two-letter abbreviation)'),
      venueCountry: z
        .string()
        .optional()
        .describe('Filter by venue country (two-letter code)'),
      taxonomyName: z
        .string()
        .optional()
        .describe('Filter by taxonomy name (e.g., "sports", "concert", "theater")'),
      taxonomyId: z.number().optional().describe('Filter by taxonomy ID'),
      dateFrom: z
        .string()
        .optional()
        .describe(
          'Filter events on or after this date (ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)'
        ),
      dateTo: z
        .string()
        .optional()
        .describe(
          'Filter events on or before this date (ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)'
        ),
      postalCode: z.string().optional().describe('Filter by postal code (US/Canada)'),
      latitude: z.number().optional().describe('Filter by latitude (requires longitude)'),
      longitude: z.number().optional().describe('Filter by longitude (requires latitude)'),
      geoIp: z
        .string()
        .optional()
        .describe('Filter by IP address, or "true" to use client IP'),
      range: z
        .string()
        .optional()
        .describe('Search radius for geolocation (e.g., "30mi", "50km"). Default: 30mi'),
      lowestPriceMin: z.number().optional().describe('Minimum lowest ticket price filter'),
      lowestPriceMax: z.number().optional().describe('Maximum lowest ticket price filter'),
      averagePriceMin: z.number().optional().describe('Minimum average ticket price filter'),
      averagePriceMax: z.number().optional().describe('Maximum average ticket price filter'),
      sort: z
        .enum([
          'datetime_local.asc',
          'datetime_local.desc',
          'score.asc',
          'score.desc',
          'announce_date.asc',
          'announce_date.desc',
          'id.asc',
          'id.desc'
        ])
        .optional()
        .describe('Sort order for results. Default: datetime_utc.asc'),
      page: z.number().optional().describe('Page number (1-indexed). Default: 1'),
      perPage: z.number().optional().describe('Results per page. Default: 10')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema).describe('List of matching events'),
      total: z.number().describe('Total number of matching events'),
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
    if (ctx.input.performerIds?.length)
      params['performers.id'] = ctx.input.performerIds.join(',');
    if (ctx.input.performerSlugs?.length)
      params['performers.slug'] = ctx.input.performerSlugs.join(',');
    if (ctx.input.venueId) params['venue.id'] = String(ctx.input.venueId);
    if (ctx.input.venueCity) params['venue.city'] = ctx.input.venueCity;
    if (ctx.input.venueState) params['venue.state'] = ctx.input.venueState;
    if (ctx.input.venueCountry) params['venue.country'] = ctx.input.venueCountry;
    if (ctx.input.taxonomyName) params['taxonomies.name'] = ctx.input.taxonomyName;
    if (ctx.input.taxonomyId) params['taxonomies.id'] = String(ctx.input.taxonomyId);
    if (ctx.input.dateFrom) params['datetime_utc.gte'] = ctx.input.dateFrom;
    if (ctx.input.dateTo) params['datetime_utc.lte'] = ctx.input.dateTo;
    if (ctx.input.postalCode) params.postal_code = ctx.input.postalCode;
    if (ctx.input.latitude) params.lat = String(ctx.input.latitude);
    if (ctx.input.longitude) params.lon = String(ctx.input.longitude);
    if (ctx.input.geoIp) params.geoip = ctx.input.geoIp;
    if (ctx.input.range) params.range = ctx.input.range;
    if (ctx.input.lowestPriceMin)
      params['lowest_price.gte'] = String(ctx.input.lowestPriceMin);
    if (ctx.input.lowestPriceMax)
      params['lowest_price.lte'] = String(ctx.input.lowestPriceMax);
    if (ctx.input.averagePriceMin)
      params['average_price.gte'] = String(ctx.input.averagePriceMin);
    if (ctx.input.averagePriceMax)
      params['average_price.lte'] = String(ctx.input.averagePriceMax);
    if (ctx.input.sort) params.sort = ctx.input.sort;
    if (ctx.input.page) params.page = String(ctx.input.page);
    if (ctx.input.perPage) params.per_page = String(ctx.input.perPage);

    let response = await client.searchEvents(params);

    let events = response.events.map(e => ({
      eventId: e.id,
      title: e.title,
      shortTitle: e.short_title,
      url: e.url,
      type: e.type,
      datetimeLocal: e.datetime_local,
      datetimeUtc: e.datetime_utc,
      timeTbd: e.time_tbd,
      dateTbd: e.date_tbd,
      score: e.score,
      venue: {
        venueId: e.venue.id,
        name: e.venue.name,
        city: e.venue.city,
        state: e.venue.state,
        country: e.venue.country,
        address: e.venue.address,
        postalCode: e.venue.postal_code
      },
      performers: e.performers.map(p => ({
        performerId: p.id,
        name: p.name,
        shortName: p.short_name,
        type: p.type,
        image: p.image || null,
        primary: p.primary,
        homeTeam: p.home_team,
        awayTeam: p.away_team
      })),
      taxonomies: e.taxonomies.map(t => ({
        taxonomyId: t.id,
        name: t.name
      })),
      stats: {
        listingCount: e.stats.listing_count,
        averagePrice: e.stats.average_price,
        lowestPrice: e.stats.lowest_price,
        highestPrice: e.stats.highest_price,
        medianPrice: e.stats.median_price
      }
    }));

    let total = response.meta.total;
    let page = response.meta.page;
    let perPage = response.meta.per_page;

    let summaryParts = [`Found **${total}** event(s)`];
    if (ctx.input.query) summaryParts.push(`matching "${ctx.input.query}"`);
    summaryParts.push(`(page ${page}, showing ${events.length} of ${total})`);

    if (events.length > 0) {
      summaryParts.push('\n\nTop results:');
      for (let e of events.slice(0, 5)) {
        summaryParts.push(
          `- **${e.title}** at ${e.venue.name}, ${e.venue.city} — ${e.datetimeLocal}${e.stats.lowestPrice ? ` (from $${e.stats.lowestPrice})` : ''}`
        );
      }
    }

    return {
      output: { events, total, page, perPage },
      message: summaryParts.join('\n')
    };
  })
  .build();
