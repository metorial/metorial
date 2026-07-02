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

export let updateLocation = SlateTool.create(spec, {
  name: 'Update Location',
  key: 'update_location',
  description: `Update an existing location in Mapulus. Any provided fields will be updated; omitted fields remain unchanged. Can update coordinates, address, title, label, layer assignment, custom attributes, external ID, and travel boundary.`,
  instructions: [
    'Only include the fields you want to change — omitted fields are not modified.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      locationId: z.string().describe('ID of the location to update'),
      title: z.string().optional().describe('Updated title'),
      label: z.string().optional().describe('Updated map marker label'),
      latitude: z.number().optional().describe('Updated latitude'),
      longitude: z.number().optional().describe('Updated longitude'),
      address: z.string().optional().describe('Updated street address'),
      layerId: z.string().optional().describe('Move the location to a different layer'),
      externalId: z.string().optional().describe('Updated external reference ID'),
      customAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom attributes to set or update'),
      createMissingCustomAttributes: z
        .boolean()
        .optional()
        .describe('Automatically create custom attribute definitions that do not yet exist'),
      travelBoundary: travelBoundarySchema.optional().describe('Updated travel boundary')
    })
  )
  .output(
    z
      .object({
        locationId: z.string().describe('Unique identifier of the updated location'),
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
        updatedAt: z.string().optional().describe('Last update timestamp')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new MapulusClient(ctx.auth.token);
    let loc = await client.updateLocation(ctx.input);

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
      updatedAt: loc.updated_at
    };

    return {
      output,
      message: `Updated location **${output.title || output.locationId}**.`
    };
  })
  .build();
