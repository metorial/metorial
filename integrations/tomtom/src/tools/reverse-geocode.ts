import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let reverseGeocode = SlateTool.create(spec, {
  name: 'Reverse Geocode',
  key: 'reverse_geocode',
  description: `Convert geographic coordinates (latitude/longitude) into a human-readable address. Returns the closest matching address, street, or area for the given location.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().describe('Latitude of the point to reverse geocode (-90 to 90)'),
      lon: z.number().describe('Longitude of the point to reverse geocode (-180 to 180)'),
      radius: z.number().optional().describe('Search radius in meters (default 10000)'),
      language: z
        .string()
        .optional()
        .describe('Language for results (IETF tag, e.g. "en-US")'),
      entityType: z
        .string()
        .optional()
        .describe('Filter by geography level: Country, Municipality, PostalCodeArea, etc.')
    })
  )
  .output(
    z.object({
      addresses: z
        .array(
          z.object({
            streetNumber: z.string().optional().describe('Street number'),
            streetName: z.string().optional().describe('Street name'),
            municipality: z.string().optional().describe('City or town'),
            countrySubdivision: z.string().optional().describe('State or province code'),
            postalCode: z.string().optional().describe('Postal or ZIP code'),
            countryCode: z.string().optional().describe('Country code'),
            country: z.string().optional().describe('Country name'),
            freeformAddress: z.string().optional().describe('Full formatted address'),
            position: z
              .object({
                lat: z.number().describe('Latitude'),
                lon: z.number().describe('Longitude')
              })
              .optional()
              .describe('Matched position')
          })
        )
        .describe('Matched addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.reverseGeocode({
      lat: ctx.input.lat,
      lon: ctx.input.lon,
      radius: ctx.input.radius,
      language: ctx.input.language,
      entityType: ctx.input.entityType
    });

    let addresses = (data.addresses || []).map((a: any) => ({
      streetNumber: a.address?.streetNumber,
      streetName: a.address?.streetName,
      municipality: a.address?.municipality,
      countrySubdivision: a.address?.countrySubdivision,
      postalCode: a.address?.postalCode,
      countryCode: a.address?.countryCode,
      country: a.address?.country,
      freeformAddress: a.address?.freeformAddress,
      position: a.position ? { lat: a.position.lat, lon: a.position.lon } : undefined
    }));

    let primaryAddress = addresses[0]?.freeformAddress || 'Unknown location';

    return {
      output: { addresses },
      message: `Reverse geocoded (${ctx.input.lat}, ${ctx.input.lon}) → **${primaryAddress}**`
    };
  })
  .build();
