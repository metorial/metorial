import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapulusClient } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z
  .object({
    locationId: z.string().describe('Unique identifier of the location'),
    title: z.string().optional().describe('Title of the location'),
    label: z.string().optional().describe('Map marker label'),
    latitude: z.number().optional().describe('Latitude coordinate'),
    longitude: z.number().optional().describe('Longitude coordinate'),
    address: z.string().optional().describe('Street address'),
    externalId: z.string().optional().describe('External reference ID'),
    layerId: z.string().optional().describe('Layer the location belongs to'),
    customAttributes: z.record(z.string(), z.any()).optional().describe('Custom attributes'),
    nearestMeta: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Provider distance and duration details; these may be absent for unroutable sources'
      )
  })
  .passthrough();

export let searchNearby = SlateTool.create(spec, {
  name: 'Search Nearby Locations',
  key: 'search_nearby',
  description: `Find locations near a given point within a map. Provide either coordinates (latitude/longitude) or an address to search around. Returns up to 24 nearest locations. A radius filters these results by the direct geographic distance, so it may not include every location within the radius.`,
  instructions: [
    'Provide either an address or latitude/longitude coordinates as the center point.',
    'A mapId is required to scope the search to a specific map.',
    'A radius requires latitude and longitude. It filters the returned nearest candidates; it does not search beyond the first 24.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map to search within'),
      latitude: z.number().optional().describe('Latitude of the center point'),
      longitude: z.number().optional().describe('Longitude of the center point'),
      address: z
        .string()
        .optional()
        .describe('Address to search near (geocoded automatically)'),
      radius: z.number().optional().describe('Search radius'),
      unit: z.string().optional().describe('Unit for radius, e.g. "km", "miles"'),
      profile: z
        .enum(['driving', 'cycling', 'walking'])
        .optional()
        .describe('Travel profile used to rank locations'),
      sortBy: z
        .enum(['distance', 'time'])
        .optional()
        .describe('Sort nearby results by travel distance or duration'),
      limit: z
        .number()
        .optional()
        .describe('Number of nearest results to request, from 1 to 24'),
      liveTraffic: z
        .boolean()
        .optional()
        .describe('Include live traffic in routing calculations')
    })
  )
  .output(
    z.object({
      locations: z.array(locationSchema).describe('Locations found near the specified point')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapulusClient(ctx.auth.token);
    let rawLocations = await client.searchNearby(ctx.input);

    let locations = (Array.isArray(rawLocations) ? rawLocations : [rawLocations]).map(
      (loc: any) => ({
        locationId: loc.id,
        title: loc.title,
        label: loc.label,
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address,
        externalId: loc.external_id,
        layerId: loc.layer_id,
        customAttributes: loc.custom_attributes,
        nearestMeta: loc.nearest_meta
      })
    );

    return {
      output: { locations },
      message: `Found **${locations.length}** location(s) nearby${ctx.input.address ? ` "${ctx.input.address}"` : ` (${ctx.input.latitude}, ${ctx.input.longitude})`}.`
    };
  })
  .build();
