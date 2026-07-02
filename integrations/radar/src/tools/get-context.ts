import { SlateTool } from 'slates';
import { z } from 'zod';
import { RadarClient } from '../lib/client';
import { spec } from '../spec';

export let getContextTool = SlateTool.create(spec, {
  name: 'Get Location Context',
  key: 'get_location_context',
  description: `Get the location context for a set of coordinates without creating or updating a user. Returns nearby geofences, places, country, state, DMA, and postal code for the given location. Useful for anonymous, stateless location lookups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude'),
      longitude: z.number().describe('Longitude')
    })
  )
  .output(
    z.object({
      geofences: z.array(z.any()).optional().describe('Geofences at this location'),
      place: z.any().optional().describe('Place at this location'),
      country: z.any().optional().describe('Country for this location'),
      state: z.any().optional().describe('State for this location'),
      dma: z.any().optional().describe('DMA for this location'),
      postalCode: z.any().optional().describe('Postal code for this location')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.getContext({
      coordinates: `${ctx.input.latitude},${ctx.input.longitude}`
    });

    let context = result.context || result;

    return {
      output: {
        geofences: context.geofences,
        place: context.place,
        country: context.country,
        state: context.state,
        dma: context.dma,
        postalCode: context.postalCode
      },
      message: `Location context retrieved for (${ctx.input.latitude}, ${ctx.input.longitude}).`
    };
  })
  .build();
