import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVenueDetails = SlateTool.create(spec, {
  name: 'Get Venue Details',
  key: 'get_venue_details',
  description:
    'Retrieve a SeatGeek venue by ID, including its address, coordinates, popularity score, and ticket page. Use a venue ID from event or venue search.',
  tags: { readOnly: true }
})
  .input(z.object({ venueId: z.number().describe('SeatGeek venue ID') }))
  .output(
    z.object({
      venueId: z.number().describe('Unique venue ID'),
      name: z.string().describe('Venue name'),
      url: z.string().describe('SeatGeek venue ticket page'),
      score: z.number().describe('Venue popularity score'),
      address: z.string().optional().describe('Street address when known'),
      extendedAddress: z.string().optional().describe('Additional address when known'),
      city: z.string().describe('City'),
      state: z.string().describe('State or province'),
      country: z.string().describe('Country code'),
      postalCode: z.string().describe('Postal code'),
      latitude: z.number().describe('Latitude'),
      longitude: z.number().describe('Longitude'),
      timezone: z.string().optional().describe('IANA timezone when supplied'),
      capacity: z.number().optional().describe('Venue capacity when supplied'),
      raw: z.unknown().optional().describe('Original provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, ...ctx.config });
    let venue = await client.getVenue(ctx.input.venueId);
    return {
      output: {
        venueId: venue.id,
        name: venue.name,
        url: venue.url,
        score: venue.score,
        address: venue.address ?? undefined,
        extendedAddress: venue.extended_address ?? undefined,
        city: venue.city,
        state: venue.state,
        country: venue.country,
        postalCode: venue.postal_code,
        latitude: venue.location.lat,
        longitude: venue.location.lon,
        timezone: venue.timezone,
        capacity: venue.capacity,
        raw: venue
      },
      message: `Retrieved ${venue.name} in ${venue.city}, ${venue.state}.`
    };
  })
  .build();
