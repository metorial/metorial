import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProperty = SlateTool.create(spec, {
  name: 'Get Property',
  key: 'get_property',
  description: `Retrieve detailed information about a specific property, including its room types. Returns the property details and all available room types for that property.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      propertyId: z.number().describe('The ID of the property to retrieve'),
      includeRooms: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to also fetch room types for the property'),
      includeInOut: z.boolean().optional().describe('Include check-in/check-out time details')
    })
  )
  .output(
    z.object({
      property: z.record(z.string(), z.any()).describe('Property details'),
      rooms: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Room types for the property')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let property = await client.getProperty(ctx.input.propertyId, {
      includeInOut: ctx.input.includeInOut
    });

    let rooms: Record<string, unknown>[] | undefined;
    if (ctx.input.includeRooms) {
      rooms = await client.getPropertyRooms(ctx.input.propertyId);
    }

    let propertyName =
      property.name ?? property.property_name ?? `Property #${ctx.input.propertyId}`;

    return {
      output: { property, rooms },
      message: `Retrieved property **${propertyName}**${rooms ? ` with ${rooms.length} room type(s)` : ''}.`
    };
  })
  .build();
