import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listConnectionsTool = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `List data sync connections in Airbyte. Connections link a source to a destination and define sync behavior. Supports filtering by workspace and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceIds: z
        .array(z.string())
        .optional()
        .describe('Filter connections by workspace IDs.'),
      includeDeleted: z
        .boolean()
        .optional()
        .describe('Include deleted connections in results.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of connections to return (1-100).'),
      offset: z.number().optional().describe('Offset for pagination.')
    })
  )
  .output(
    z.object({
      connections: z.array(
        z.object({
          connectionId: z.string(),
          name: z.string(),
          sourceId: z.string(),
          destinationId: z.string(),
          workspaceId: z.string(),
          status: z.string(),
          scheduleType: z.string().optional(),
          dataResidency: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listConnections({
      workspaceIds: ctx.input.workspaceIds,
      includeDeleted: ctx.input.includeDeleted,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        connections: result.data.map(c => ({
          connectionId: c.connectionId,
          name: c.name,
          sourceId: c.sourceId,
          destinationId: c.destinationId,
          workspaceId: c.workspaceId,
          status: c.status,
          scheduleType: c.schedule?.scheduleType,
          dataResidency: c.dataResidency
        })),
        hasMore: !!result.next
      },
      message: `Found **${result.data.length}** connection(s).${result.next ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
