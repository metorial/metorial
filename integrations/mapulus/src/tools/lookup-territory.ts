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
    customAttributes: z.record(z.string(), z.any()).optional().describe('Custom attributes')
  })
  .passthrough();

export let lookupTerritory = SlateTool.create(spec, {
  name: 'Lookup Territory',
  key: 'lookup_territory',
  description: `Find all locations within a specific Australian territory or boundary on a map. Supports official boundary types including suburbs, postcodes, and Local Government Areas (LGAs). Useful for territory management, regional analysis, and identifying which locations fall within a given area.`,
  instructions: [
    'Use boundaryType values like "suburb", "postcode", or "lga" to specify the boundary category.',
    'The boundaryName should match the official Australian boundary name (e.g. "Brisbane", "4000", "City of Sydney").'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map to search within'),
      boundaryType: z
        .string()
        .describe(
          'Type of boundary: "suburb", "postcode", "lga", or other supported Australian boundary type'
        ),
      boundaryName: z
        .string()
        .describe(
          'Name or identifier of the boundary (e.g. suburb name, postcode number, LGA name)'
        )
    })
  )
  .output(
    z.object({
      locations: z
        .array(locationSchema)
        .describe('Locations found within the specified territory'),
      boundaryType: z.string().describe('The boundary type that was searched'),
      boundaryName: z.string().describe('The boundary name that was searched')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapulusClient(ctx.auth.token);
    let rawLocations = await client.lookupTerritory(
      ctx.input.mapId,
      ctx.input.boundaryType,
      ctx.input.boundaryName
    );

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
        customAttributes: loc.custom_attributes
      })
    );

    return {
      output: {
        locations,
        boundaryType: ctx.input.boundaryType,
        boundaryName: ctx.input.boundaryName
      },
      message: `Found **${locations.length}** location(s) within ${ctx.input.boundaryType} "${ctx.input.boundaryName}".`
    };
  })
  .build();
