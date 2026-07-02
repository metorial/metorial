import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let geoCoordinatesTool = SlateTool.create(spec, {
  name: 'Geo Coordinates Lookup',
  key: 'geo_coordinates',
  description: `Retrieve geographic coordinates (latitude and longitude) for a location name. Use the returned coordinates with the Search News tool's **locationFilter** parameter to find news mentioning locations within a given radius. Format: \`latitude,longitude,radiusKm\`.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      location: z
        .string()
        .max(1000)
        .describe('Location name or address (e.g. "London, UK", "Tokyo, Japan")')
    })
  )
  .output(
    z.object({
      latitude: z.number().describe('Latitude of the location'),
      longitude: z.number().describe('Longitude of the location'),
      city: z.string().nullable().describe('Resolved city name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getGeoCoordinates(ctx.input.location);

    return {
      output: {
        latitude: result.latitude,
        longitude: result.longitude,
        city: result.city
      },
      message: `Coordinates for "${ctx.input.location}": **${result.latitude}, ${result.longitude}**${result.city ? ` (${result.city})` : ''}. Use as locationFilter: \`${result.latitude},${result.longitude},15\``
    };
  })
  .build();
