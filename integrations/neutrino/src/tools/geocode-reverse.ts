import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let geocodeReverseTool = SlateTool.create(spec, {
  name: 'Reverse Geocode',
  key: 'geocode_reverse',
  description: `Convert geographic coordinates (latitude/longitude) or a geohash into a physical address. Useful for processing GPS data from mobile devices. Supports multiple zoom levels from address-specific to country-level.`,
  constraints: ['Rate limited to 20 requests per second'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.string().optional().describe('Latitude in decimal degrees'),
      longitude: z.string().optional().describe('Longitude in decimal degrees'),
      geohash: z.string().optional().describe('Geohash string (alternative to lat/long)'),
      languageCode: z
        .string()
        .optional()
        .describe('Language for results: ar, de, en, es, fr, it, ja, nl, pt, ru, zh'),
      zoom: z
        .enum(['address', 'street', 'city', 'state', 'country'])
        .optional()
        .describe('Precision level for results')
    })
  )
  .output(
    z.object({
      found: z.boolean().describe('Whether a location was found'),
      latitude: z.number().describe('Latitude coordinate'),
      longitude: z.number().describe('Longitude coordinate'),
      address: z.string().describe('Formatted address'),
      city: z.string().describe('City name'),
      state: z.string().describe('State/province name'),
      postalCode: z.string().describe('Postal/zip code'),
      country: z.string().describe('Country name'),
      countryCode: z.string().describe('ISO 2-letter country code'),
      continentCode: z.string().describe('Continent code'),
      locationType: z.string().describe('Location type'),
      buildingType: z.string().describe('Building type classification'),
      timezone: z
        .object({
          timezoneId: z.string().describe('IANA timezone ID'),
          name: z.string().describe('Timezone name'),
          abbr: z.string().describe('Timezone abbreviation'),
          offset: z.string().describe('UTC offset')
        })
        .describe('Timezone information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.geocodeReverse({
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      geohash: ctx.input.geohash,
      languageCode: ctx.input.languageCode,
      zoom: ctx.input.zoom
    });

    let tz = result.timezone ?? {};

    return {
      output: {
        found: result.found ?? false,
        latitude: result.latitude ?? 0,
        longitude: result.longitude ?? 0,
        address: result.address ?? '',
        city: result.city ?? '',
        state: result.state ?? '',
        postalCode: result.postalCode ?? '',
        country: result.country ?? '',
        countryCode: result.countryCode ?? '',
        continentCode: result.continentCode ?? '',
        locationType: result.locationType ?? '',
        buildingType: result.buildingType ?? '',
        timezone: {
          timezoneId: tz.id ?? '',
          name: tz.name ?? '',
          abbr: tz.abbr ?? '',
          offset: tz.offset ?? ''
        }
      },
      message: result.found
        ? `Location found: **${result.address}** (${result.city ? `${result.city}, ` : ''}${result.country}).`
        : `No location found for the given coordinates.`
    };
  })
  .build();
