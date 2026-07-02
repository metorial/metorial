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
  latitude: z.string().describe('Latitude of the centroid in WGS 84 format'),
  longitude: z.string().describe('Longitude of the centroid in WGS 84 format'),
  boundingBox: z
    .object({
      northeast: locationSchema.describe('Northeast corner of the bounding box'),
      southwest: locationSchema.describe('Southwest corner of the bounding box')
    })
    .describe('Bounding box coordinates for the matched place'),
  osmUrl: z.string().describe('OpenStreetMap URL for the place')
});

export let forwardGeocode = SlateTool.create(spec, {
  name: 'Forward Geocode',
  key: 'forward_geocode',
  description: `Convert an address or place name into geographic coordinates (latitude and longitude). Returns matching locations with coordinates, formatted addresses, bounding box information, and place classification. Supports filtering results by country using ISO 3166-1 alpha-2 codes. Built-in spell check improves accuracy of results.`,
  constraints: [
    'Search query is limited to 50 characters.',
    'Subject to daily request limits (2,500/day on free plan).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .max(50)
        .describe('Address or place name to geocode (max 50 characters)'),
      countryCode: z
        .string()
        .length(2)
        .optional()
        .describe(
          'ISO 3166-1 alpha-2 country code to restrict results (e.g., "US", "GB", "DE")'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status (e.g., "ok", "ZERO_RESULTS")'),
      results: z.array(resultSchema).describe('Array of matching geocoded locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.forwardGeocode({
      query: ctx.input.query,
      country: ctx.input.countryCode
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
      osmUrl: r.osmurl
    }));

    let resultCount = results.length;
    let message =
      resultCount > 0
        ? `Found **${resultCount}** result${resultCount > 1 ? 's' : ''} for "${ctx.input.query}". Top result: **${results[0]!.formattedAddress}** (${results[0]!.latitude}, ${results[0]!.longitude}).`
        : `No results found for "${ctx.input.query}".`;

    return {
      output: {
        status: response.status,
        results
      },
      message
    };
  })
  .build();
