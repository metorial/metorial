import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapulusClient } from '../lib/client';
import { spec } from '../spec';

export let getLocation = SlateTool.create(spec, {
  name: 'Get Location',
  key: 'get_location',
  description:
    'Retrieve a location by its ID, including its coordinates, layer, custom attributes, and travel boundary configuration.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      locationId: z
        .string()
        .describe('Location ID returned by create_location or find_locations')
    })
  )
  .output(
    z.object({
      locationId: z.string(),
      title: z.string().optional(),
      label: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      address: z.string().optional(),
      externalId: z.string().optional(),
      mapId: z.string().optional(),
      layerId: z.string().optional(),
      customAttributes: z.record(z.string(), z.unknown()).optional(),
      travelBoundary: z
        .object({
          mode: z.string().optional(),
          value: z.number().optional(),
          unit: z.string().optional()
        })
        .optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let location = await new MapulusClient(ctx.auth.token).getLocation(ctx.input.locationId);
    return {
      output: {
        locationId: location.id,
        title: location.title,
        label: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        externalId: location.external_id,
        mapId: location.map_id,
        layerId: location.layer_id,
        customAttributes: location.custom_attributes,
        travelBoundary: location.travel_boundary,
        createdAt: location.created_at,
        updatedAt: location.updated_at
      },
      message: `Retrieved location **${location.title || location.id}**.`
    };
  })
  .build();
