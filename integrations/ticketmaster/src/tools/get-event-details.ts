import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DiscoveryClient } from '../lib/client';
import { mapEvent } from '../lib/mappers';
import { parseTicketmasterOutput } from '../lib/output';
import { spec } from '../spec';

let outputSchema = z.object({
  eventId: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  locale: z.string(),
  description: z.string().optional(),
  pleaseNote: z.string(),
  startDate: z.string(),
  startLocalDate: z.string(),
  startLocalTime: z.string(),
  startDateTBD: z.boolean(),
  startDateTBA: z.boolean(),
  startTimeTBA: z.boolean(),
  endDate: z.string().optional(),
  timezone: z.string(),
  statusCode: z.string(),
  spanMultipleDays: z.boolean().optional(),
  priceRanges: z.array(
    z.object({
      type: z.string(),
      currency: z.string(),
      min: z.number().nullable(),
      max: z.number().nullable()
    })
  ),
  seatmap: z.string().optional(),
  ticketLimit: z.string().optional(),
  ageRestrictions: z.boolean().optional(),
  accessibility: z.string().optional(),
  images: z.array(
    z.object({
      url: z.string(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      ratio: z.string()
    })
  ),
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
  classifications: z.array(
    z.object({
      primary: z.boolean(),
      segmentName: z.string(),
      segmentId: z.string(),
      genreName: z.string(),
      genreId: z.string(),
      subGenreName: z.string(),
      subGenreId: z.string(),
      typeName: z.string().optional(),
      subTypeName: z.string().optional()
    })
  ),
  promoter: z
    .object({
      promoterId: z.string(),
      name: z.string().optional(),
      description: z.string().optional()
    })
    .nullable(),
  venue: z
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
    .nullable(),
  attractions: z.array(
    z.object({
      attractionId: z.string(),
      name: z.string(),
      url: z.string(),
      classifications: z.array(
        z.object({
          segmentName: z.string(),
          genreName: z.string()
        })
      )
    })
  )
});

export let getEventDetailsTool = SlateTool.create(spec, {
  name: 'Get Event Details',
  key: 'get_event_details',
  description: `Retrieve full details for a specific event by its Ticketmaster event ID. Returns comprehensive information including dates, pricing, venue, attractions, sales periods, images, accessibility info, and direct ticket purchase URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('Ticketmaster event ID')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DiscoveryClient({
      token: ctx.auth.token,
      countryCode: ctx.config.countryCode,
      locale: ctx.config.locale
    });

    let response = await client.getEventDetails(ctx.input.eventId);
    let event = mapEvent(response);

    if (!event) {
      throw createApiServiceError(`Event not found: ${ctx.input.eventId}`, {
        reason: 'not_found'
      });
    }

    return {
      output: parseTicketmasterOutput(outputSchema, event, 'get-event-details'),
      message: `**${event.name}** - ${event.startLocalDate} ${event.startLocalTime ? `at ${event.startLocalTime}` : ''} | Status: ${event.statusCode} | Venue: ${event.venue?.name || 'N/A'}`
    };
  })
  .build();
