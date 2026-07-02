import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z.object({
  lat: z.string().describe('Latitude of the location'),
  lng: z.string().describe('Longitude of the location')
});

let resultSchema = z.object({
  placeClass: z
    .string()
    .describe('Classification category of the place (e.g., "tourism", "building")'),
  placeType: z
    .string()
    .describe('Specific type within the class (e.g., "attraction", "residential")'),
  name: z.string().describe('Name of the place'),
  street: z.string().describe('Street address'),
  city: z.string().describe('City name'),
  state: z.string().describe('State or region name'),
  postcode: z.string().describe('Postal/ZIP code'),
  country: z.string().describe('Country name'),
  formattedAddress: z.string().describe('Full formatted postal address'),
  latitude: z.string().describe('Latitude of the returned place in WGS 84 format'),
  longitude: z.string().describe('Longitude of the returned place in WGS 84 format'),
  boundingBox: z
    .object({
      northeast: locationSchema.describe('Northeast corner of the bounding box'),
      southwest: locationSchema.describe('Southwest corner of the bounding box')
    })
    .describe('Bounding box coordinates for the matched place'),
  osmUrl: z.string().describe('OpenStreetMap URL for the place'),
  distanceKm: z
    .string()
    .optional()
    .describe('Distance in kilometers from the queried coordinates to the returned place')
});

export let reverseGeocode = SlateTool.create(spec, {
  name: 'Reverse Geocode',
  key: 'reverse_geocode',
  description: `Convert geographic coordinates (latitude and longitude) into a human-readable address. Returns the nearest matching location with a formatted address, place classification, bounding box, and the distance from the queried coordinates.`,
  constraints: ['Subject to daily request limits (2,500/day on free plan).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .describe('Latitude coordinate (WGS 84, range: -90 to 90)'),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .describe('Longitude coordinate (WGS 84, range: -180 to 180)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status (e.g., "ok", "ZERO_RESULTS")'),
      results: z.array(resultSchema).describe('Array of matching reverse-geocoded locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.reverseGeocode({
      lat: ctx.input.latitude,
      lng: ctx.input.longitude
    });

    if (response.status !== 'ok') {
      ctx.warn(`Geokeo returned status: ${response.status}`);
    }

    let results = (response.results || []).map(r => ({
      placeClass: r.class,
      placeType: r.type,
      name: r.address_components.name,
      street: r.address_components.street,
      city: r.address_components.city,
      state: r.address_components.state,
      postcode: r.address_components.postcode,
      country: r.address_components.country,
      formattedAddress: r.formatted_address,
      latitude: r.geometry.location.lat,
      longitude: r.geometry.location.lng,
      boundingBox: {
        northeast: r.geometry.viewport.northeast,
        southwest: r.geometry.viewport.southwest
      },
      osmUrl: r.osmurl,
      distanceKm: r.distance
    }));

    let resultCount = results.length;
    let message =
      resultCount > 0
        ? `Found **${resultCount}** result${resultCount > 1 ? 's' : ''} for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}). Nearest address: **${results[0]!.formattedAddress}**${results[0]!.distanceKm ? ` (${results[0]!.distanceKm} km away)` : ''}.`
        : `No results found for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}).`;

    return {
      output: {
        status: response.status,
        results
      },
      message
    };
  })
  .build();
