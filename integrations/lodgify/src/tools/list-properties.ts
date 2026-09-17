import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProperties = SlateTool.create(spec, {
  name: 'List Properties',
  key: 'list_properties',
  description: `Retrieve a list of all vacation rental properties in the Lodgify account. Returns property details including name, address, type, room types, pricing range, and configuration. Supports pagination for accounts with many properties, and can list only properties changed since a given time.`,
  instructions: [
    'Each property lists its room types under rooms, which is where the room type IDs used by the rate and availability tools come from.',
    'count is the total across all pages, so compare it with the number of properties returned to decide whether to fetch another page.',
    'Use updatedSince to pick up only properties changed since a previous run instead of paging through the whole account again.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      size: z
        .number()
        .optional()
        .describe('Number of properties per page (maximum 50, defaults to 50)'),
      includeInOut: z.boolean().optional().describe('Include check-in/check-out time details'),
      updatedSince: z
        .string()
        .optional()
        .describe(
          'Only return properties modified after this time (ISO datetime). Useful for picking up changes since a previous run'
        )
    })
  )
  .output(
    z.object({
      properties: z.array(z.record(z.string(), z.any())).describe('List of property objects'),
      count: z
        .number()
        .optional()
        .describe(
          'Total number of properties matching the request across all pages, not just this page'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listProperties({
      page: ctx.input.page,
      size: ctx.input.size,
      includeInOut: ctx.input.includeInOut,
      updatedSince: ctx.input.updatedSince,
      includeCount: true
    });

    let properties = Array.isArray(result) ? result : (result?.items ?? []);
    let count = typeof result?.count === 'number' ? result.count : properties.length;

    return {
      output: { properties, count },
      message: `Retrieved **${properties.length}** properties${count > properties.length ? ` (${count} total)` : ''}.`
    };
  })
  .build();
