import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiscoveryClient } from '../lib/client';
import { mapVenue } from '../lib/mappers';
import { spec } from '../spec';

export let getVenueDetailsTool = SlateTool.create(spec, {
  name: 'Get Venue Details',
  key: 'get_venue_details',
  description: `Retrieve full details for a specific venue by its Ticketmaster venue ID. Returns address, box office info, parking details, accessibility info, general rules, and upcoming event counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      venueId: z.string().describe('Ticketmaster venue ID')
    })
  )
  .output(
    z.object({
      venueId: z.string(),
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscoveryClient({
      token: ctx.auth.token,
      countryCode: ctx.config.countryCode,
      locale: ctx.config.locale
    });

    let response = await client.getVenueDetails(ctx.input.venueId);
    let venue = mapVenue(response);

    if (!venue) {
      throw new Error(`Venue not found: ${ctx.input.venueId}`);
    }

    return {
      output: venue,
      message: `**${venue.name}** - ${venue.address}, ${venue.city}, ${venue.stateCode} ${venue.postalCode}, ${venue.countryCode}`
    };
  })
  .build();
