import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenWeatherClient } from '../lib/client';
import { spec } from '../spec';

let geocodeResultSchema = z.object({
  name: z.string().describe('Location name'),
  latitude: z.number().describe('Latitude'),
  longitude: z.number().describe('Longitude'),
  country: z.string().describe('Country code (ISO 3166)'),
  state: z.string().optional().describe('State name (where available)')
});

export let geocodeLocation = SlateTool.create(spec, {
  name: 'Geocode Location',
  key: 'geocode_location',
  description: `Convert between location names and geographic coordinates. Supports **direct geocoding** (name/zip to coordinates) and **reverse geocoding** (coordinates to name). Use this to resolve human-readable location names into lat/lon pairs for other weather API calls, or to identify a location from coordinates.`,
  instructions: [
    'For direct geocoding, provide locationName (e.g. "London", "London,GB", "New York,NY,US") or zipCode (e.g. "10001,US")',
    'For reverse geocoding, provide latitude and longitude',
    'For US locations, include the state code: "City,StateCode,US"'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      locationName: z
        .string()
        .optional()
        .describe(
          'City name, optionally with state code and country code separated by commas (e.g. "London,GB")'
        ),
      zipCode: z
        .string()
        .optional()
        .describe('ZIP/postal code with country code (e.g. "10001,US", "E14,GB")'),
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .describe('Latitude for reverse geocoding'),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe('Longitude for reverse geocoding'),
      limit: z.number().min(1).max(5).optional().describe('Max number of results (default 5)')
    })
  )
  .output(
    z.object({
      results: z.array(geocodeResultSchema).describe('Geocoding results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpenWeatherClient({
      apiKey: ctx.auth.token
    });

    let results: any[] = [];

    if (ctx.input.zipCode) {
      let data = await client.geocodeByZip(ctx.input.zipCode);
      results = [
        {
          name: data.name,
          latitude: data.lat,
          longitude: data.lon,
          country: data.country,
          state: undefined
        }
      ];
    } else if (ctx.input.locationName) {
      let data = await client.geocodeDirect(ctx.input.locationName, ctx.input.limit);
      results = (data || []).map((r: any) => ({
        name: r.name,
        latitude: r.lat,
        longitude: r.lon,
        country: r.country,
        state: r.state
      }));
    } else if (ctx.input.latitude !== undefined && ctx.input.longitude !== undefined) {
      let data = await client.geocodeReverse(
        ctx.input.latitude,
        ctx.input.longitude,
        ctx.input.limit
      );
      results = (data || []).map((r: any) => ({
        name: r.name,
        latitude: r.lat,
        longitude: r.lon,
        country: r.country,
        state: r.state
      }));
    } else {
      throw new Error(
        'Provide either locationName, zipCode, or latitude+longitude for geocoding.'
      );
    }

    let output = { results };

    let summary = results
      .map(
        r =>
          `${r.name}${r.state ? `, ${r.state}` : ''}, ${r.country} (${r.latitude}, ${r.longitude})`
      )
      .join('; ');

    return {
      output,
      message: `Found **${results.length}** result(s): ${summary}`
    };
  })
  .build();
