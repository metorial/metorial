import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapulusClient } from '../lib/client';
import { spec } from '../spec';

let travelBoundarySchema = z.object({
  mode: z
    .string()
    .optional()
    .describe('Travel mode, e.g. "driving", "walking", "cycling", "transit"'),
  value: z.number().optional().describe('Travel time or distance value'),
  unit: z
    .string()
    .optional()
    .describe('Unit for the value, e.g. "minutes", "kilometers", "miles"')
});

export let createLocation = SlateTool.create(spec, {
  name: 'Create Location',
  key: 'create_location',
  description: `Create a new location on a specific layer in Mapulus. Locations can include coordinates, addresses, custom attributes, and an optional travel boundary (isochrone). If custom attributes are provided that don't yet exist on the layer, enable **createMissingCustomAttributes** to auto-create them.`,
  instructions: [
    'A layerId is required. Use the List Maps tool with expandLayers to find available layer IDs.',
    'Provide either an address or latitude/longitude coordinates (or both).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      layerId: z.string().describe('ID of the layer to add the location to'),
      title: z.string().optional().describe('Name or title of the location'),
      label: z.string().optional().describe('Short label displayed above the map marker'),
      latitude: z.number().optional().describe('Latitude coordinate'),
      longitude: z.number().optional().describe('Longitude coordinate'),
      address: z.string().optional().describe('Street address of the location'),
      externalId: z
        .string()
        .optional()
        .describe('External reference ID for linking with other systems'),
      customAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom key-value attributes for the location'),
      createMissingCustomAttributes: z
        .boolean()
        .optional()
        .describe('Automatically create custom attribute definitions that do not yet exist'),
      travelBoundary: travelBoundarySchema
        .optional()
        .describe('Travel boundary (isochrone) to attach to the location')
    })
  )
  .output(
    z
      .object({
        locationId: z.string().describe('Unique identifier of the created location'),
        title: z.string().optional().describe('Title of the location'),
        label: z.string().optional().describe('Map marker label'),
        latitude: z.number().optional().describe('Latitude coordinate'),
        longitude: z.number().optional().describe('Longitude coordinate'),
        address: z.string().optional().describe('Street address'),
        externalId: z.string().optional().describe('External reference ID'),
        layerId: z.string().optional().describe('Layer the location belongs to'),
        customAttributes: z
          .record(z.string(), z.any())
          .optional()
          .describe('Custom attributes'),
        createdAt: z.string().optional().describe('Creation timestamp')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new MapulusClient(ctx.auth.token);
    let loc = await client.createLocation(ctx.input);

    let output = {
      locationId: loc.id,
      title: loc.title,
      label: loc.label,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address,
      externalId: loc.external_id,
      layerId: loc.layer_id,
      customAttributes: loc.custom_attributes,
      createdAt: loc.created_at
    };

    return {
      output,
      message: `Created location **${output.title || output.locationId}**${output.address ? ` at ${output.address}` : ''}.`
    };
  })
  .build();
