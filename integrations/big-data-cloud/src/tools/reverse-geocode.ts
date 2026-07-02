import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reverseGeocodeTool = SlateTool.create(spec, {
  name: 'Reverse Geocode',
  key: 'reverse_geocode',
  description: `Convert geographic coordinates (latitude/longitude) into structured locality data including country, state/region, city, postcode, and timezone. Provides administrative boundaries-based results with full global coverage including seas and oceans, and supports locality names in 147 languages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude value (WGS 84), range [-90, 90]'),
      longitude: z.number().describe('Longitude value (WGS 84), range [-180, 180]')
    })
  )
  .output(
    z
      .object({
        latitude: z.number().describe('Requested latitude'),
        longitude: z.number().describe('Requested longitude'),
        continent: z.string().optional().describe('Continent name'),
        continentCode: z.string().optional().describe('Continent code'),
        countryName: z.string().optional().describe('Localised country name'),
        countryCode: z.string().optional().describe('ISO 3166-1 Alpha-2 country code'),
        principalSubdivision: z
          .string()
          .optional()
          .describe('Principal subdivision name (e.g. state or province)'),
        principalSubdivisionCode: z
          .string()
          .optional()
          .describe('ISO 3166-2 subdivision code'),
        city: z.string().optional().describe('Most significant populated place name'),
        locality: z.string().optional().describe('Smallest recognised geographic area name'),
        postcode: z.string().optional().describe('Postal code'),
        plusCode: z.string().optional().describe('Open Location Code (Plus Code)'),
        localityLanguageRequested: z.string().optional(),
        timezone: z
          .object({
            name: z.string().optional().describe('IANA timezone name'),
            utcOffset: z.number().optional().describe('UTC offset in hours'),
            utcOffsetSeconds: z.number().optional().describe('UTC offset in seconds'),
            abbreviation: z.string().optional().describe('Timezone abbreviation'),
            ianaTimeId: z.string().optional().describe('IANA timezone identifier')
          })
          .passthrough()
          .optional()
          .describe('Timezone information for the location')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      localityLanguage: ctx.config.localityLanguage
    });

    let result = await client.reverseGeocode({
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude
    });

    let city = result.city || result.locality || '';
    let country = result.countryName || '';
    let locationParts = [city, country].filter(Boolean).join(', ');

    return {
      output: result,
      message: `Coordinates (${ctx.input.latitude}, ${ctx.input.longitude}) resolved to **${locationParts || 'unknown location'}**.`
    };
  })
  .build();
