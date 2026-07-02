import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEventDetails = SlateTool.create(spec, {
  name: 'Get Event Details',
  key: 'get_event_details',
  description: `Retrieve full details for a specific event by its SeatGeek event ID. Returns comprehensive event information including title, date/time, venue, all performers, ticket price statistics, and the SeatGeek URL for ticket purchases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('SeatGeek event ID')
    })
  )
  .output(
    z.object({
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
      generalAdmission: z.boolean().describe('Whether the event is general admission'),
      enddatetimeUtc: z.string().nullable().describe('Event end date/time in UTC'),
      announceDate: z.string().describe('Date the event was announced'),
      createdAt: z.string().describe('Date the event was created in SeatGeek'),
      venue: z
        .object({
          venueId: z.number().describe('Venue ID'),
          name: z.string().describe('Venue name'),
          address: z.string().describe('Street address'),
          extendedAddress: z.string().describe('Extended address'),
          city: z.string().describe('City'),
          state: z.string().describe('State'),
          country: z.string().describe('Country'),
          postalCode: z.string().describe('Postal code'),
          latitude: z.number().describe('Latitude'),
          longitude: z.number().describe('Longitude'),
          timezone: z.string().describe('IANA timezone'),
          capacity: z.number().describe('Venue capacity'),
          url: z.string().describe('SeatGeek venue URL')
        })
        .describe('Venue details'),
      performers: z
        .array(
          z.object({
            performerId: z.number().describe('Performer ID'),
            name: z.string().describe('Performer name'),
            shortName: z.string().describe('Abbreviated performer name'),
            type: z.string().describe('Performer type'),
            image: z.string().nullable().describe('Performer image URL'),
            score: z.number().describe('Performer popularity score'),
            url: z.string().describe('SeatGeek performer URL'),
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      affiliateId: ctx.config.affiliateId,
      referralId: ctx.config.referralId
    });

    let e = await client.getEvent(ctx.input.eventId);

    let output = {
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
      generalAdmission: e.general_admission,
      enddatetimeUtc: e.enddatetime_utc,
      announceDate: e.announce_date,
      createdAt: e.created_at,
      venue: {
        venueId: e.venue.id,
        name: e.venue.name,
        address: e.venue.address,
        extendedAddress: e.venue.extended_address,
        city: e.venue.city,
        state: e.venue.state,
        country: e.venue.country,
        postalCode: e.venue.postal_code,
        latitude: e.venue.location.lat,
        longitude: e.venue.location.lon,
        timezone: e.venue.timezone,
        capacity: e.venue.capacity,
        url: e.venue.url
      },
      performers: e.performers.map(p => ({
        performerId: p.id,
        name: p.name,
        shortName: p.short_name,
        type: p.type,
        image: p.image || null,
        score: p.score,
        url: p.url,
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
    };

    let performerNames = e.performers.map(p => p.name).join(', ');
    let priceInfo = e.stats.lowest_price ? ` | Tickets from $${e.stats.lowest_price}` : '';
    let message = `**${e.title}**\n📍 ${e.venue.name}, ${e.venue.city}, ${e.venue.state}\n📅 ${e.datetime_local}${e.time_tbd ? ' (time TBD)' : ''}\n🎭 ${performerNames}${priceInfo}\n🔗 [Buy tickets](${e.url})`;

    return {
      output,
      message
    };
  })
  .build();
