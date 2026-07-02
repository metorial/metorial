import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapulusClient } from '../lib/client';
import { spec } from '../spec';

export let addTravelBoundary = SlateTool.create(spec, {
  name: 'Add Travel Boundary',
  key: 'add_travel_boundary',
  description: `Add a travel boundary (isochrone) to an existing location. Travel boundaries visualize the area reachable from a location within a given time or distance, useful for service area analysis, delivery zones, and coverage planning.`,
  instructions: [
    'Specify the travel mode (e.g. "driving", "walking"), a numeric value, and the unit (e.g. "minutes", "kilometers").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      locationId: z.string().describe('ID of the location to add the travel boundary to'),
      mode: z
        .string()
        .optional()
        .describe('Travel mode: "driving", "walking", "cycling", or "transit"'),
      value: z.number().optional().describe('Travel time or distance value'),
      unit: z
        .string()
        .optional()
        .describe('Unit for the value: "minutes", "kilometers", "miles"')
    })
  )
  .output(
    z
      .object({
        locationId: z.string().describe('ID of the location'),
        title: z.string().optional().describe('Title of the location'),
        latitude: z.number().optional().describe('Latitude coordinate'),
        longitude: z.number().optional().describe('Longitude coordinate'),
        address: z.string().optional().describe('Street address'),
        travelBoundary: z
          .object({
            mode: z.string().optional().describe('Travel mode'),
            value: z.number().optional().describe('Travel value'),
            unit: z.string().optional().describe('Travel unit')
          })
          .passthrough()
          .optional()
          .describe('The travel boundary configuration')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new MapulusClient(ctx.auth.token);
    let loc = await client.addTravelBoundary(ctx.input.locationId, {
      mode: ctx.input.mode,
      value: ctx.input.value,
      unit: ctx.input.unit
    });

    let output = {
      locationId: loc.id,
      title: loc.title,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address,
      travelBoundary: loc.travel_boundary
        ? {
            mode: loc.travel_boundary.mode,
            value: loc.travel_boundary.value,
            unit: loc.travel_boundary.unit
          }
        : undefined
    };

    return {
      output,
      message: `Added travel boundary to location **${output.title || output.locationId}** (${ctx.input.value} ${ctx.input.unit} ${ctx.input.mode}).`
    };
  })
  .build();
