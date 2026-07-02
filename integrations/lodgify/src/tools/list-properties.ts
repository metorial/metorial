import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProperties = SlateTool.create(spec, {
  name: 'List Properties',
  key: 'list_properties',
  description: `Retrieve a list of all vacation rental properties in the Lodgify account. Returns property details including name, address, type, and configuration. Supports pagination for accounts with many properties.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      size: z.number().optional().describe('Number of properties per page'),
      includeInOut: z.boolean().optional().describe('Include check-in/check-out time details')
    })
  )
  .output(
    z.object({
      properties: z.array(z.record(z.string(), z.any())).describe('List of property objects'),
      count: z.number().optional().describe('Total number of properties if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listProperties({
      page: ctx.input.page,
      size: ctx.input.size,
      includeInOut: ctx.input.includeInOut
    });

    let properties = Array.isArray(result) ? result : (result.items ?? []);
    let count = result.count ?? result.total_count ?? properties.length;

    return {
      output: { properties, count },
      message: `Retrieved **${properties.length}** properties${count > properties.length ? ` (${count} total)` : ''}.`
    };
  })
  .build();
