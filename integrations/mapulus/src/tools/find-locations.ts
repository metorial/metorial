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
    mapId: z.string().optional().describe('Map the location belongs to'),
    customAttributes: z.record(z.string(), z.any()).optional().describe('Custom attributes'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp')
  })
  .passthrough();

export let findLocations = SlateTool.create(spec, {
  name: 'Find Locations',
  key: 'find_locations',
  description: `Search for locations in Mapulus by various criteria. Filter by map, layer, address, coordinates, location ID, or external ID. Returns all matching locations with their full details.`,
  instructions: [
    'Provide at least one search criterion. Multiple criteria are combined to narrow results.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      locationId: z.string().optional().describe('Find a specific location by its Mapulus ID'),
      externalId: z.string().optional().describe('Find locations by external reference ID'),
      layerId: z.string().optional().describe('Filter locations by layer'),
      mapId: z.string().optional().describe('Filter locations by map'),
      address: z.string().optional().describe('Search by address text'),
      latitude: z.number().optional().describe('Filter by latitude'),
      longitude: z.number().optional().describe('Filter by longitude')
    })
  )
  .output(
    z.object({
      locations: z.array(locationSchema).describe('Matching locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapulusClient(ctx.auth.token);
    let rawLocations = await client.findLocations(ctx.input);

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
        mapId: loc.map_id,
        customAttributes: loc.custom_attributes,
        createdAt: loc.created_at,
        updatedAt: loc.updated_at
      })
    );

    return {
      output: { locations },
      message: `Found **${locations.length}** location(s) matching the search criteria.`
    };
  })
  .build();
