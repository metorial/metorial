import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDestinationsTool = SlateTool.create(spec, {
  name: 'List Destinations',
  key: 'list_destinations',
  description: `List configured destination connectors in Airbyte (data warehouses, databases, lakes, etc.). Supports filtering by workspace and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceIds: z
        .array(z.string())
        .optional()
        .describe('Filter destinations by workspace IDs.'),
      includeDeleted: z
        .boolean()
        .optional()
        .describe('Include deleted destinations in results.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of destinations to return (1-100).'),
      offset: z.number().optional().describe('Offset for pagination.')
    })
  )
  .output(
    z.object({
      destinations: z.array(
        z.object({
          destinationId: z.string(),
          name: z.string(),
          destinationType: z.string(),
          workspaceId: z.string(),
          configuration: z.record(z.string(), z.any())
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listDestinations({
      workspaceIds: ctx.input.workspaceIds,
      includeDeleted: ctx.input.includeDeleted,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        destinations: result.data.map(d => ({
          destinationId: d.destinationId,
          name: d.name,
          destinationType: d.destinationType,
          workspaceId: d.workspaceId,
          configuration: d.configuration
        })),
        hasMore: !!result.next
      },
      message: `Found **${result.data.length}** destination(s).${result.next ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
