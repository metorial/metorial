import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `Retrieve business locations. Get all locations or a specific location by ID. Locations are used across the platform to organize services, staff, clients, and contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      locationId: z
        .string()
        .optional()
        .describe('Get a specific location by ID. If omitted, returns all locations.')
    })
  )
  .output(
    z.object({
      locations: z.array(z.record(z.string(), z.any())).describe('Array of location records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    if (ctx.input.locationId) {
      let result = await client.getLocation(ctx.input.locationId);
      return {
        output: { locations: [result] },
        message: `Retrieved location **${result.title || result.name || ctx.input.locationId}**.`
      };
    }

    let result = await client.listLocations();
    let locations = Array.isArray(result) ? result : result.locations || result.data || [];

    return {
      output: { locations },
      message: `Found **${locations.length}** location(s).`
    };
  })
  .build();
