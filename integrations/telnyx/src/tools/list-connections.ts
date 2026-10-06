import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export const listConnections = SlateTool.create(spec, {
  key: 'list_connections',
  name: 'List Connections',
  description:
    'Discover Telnyx connections by native ID, type, name and active state. Select the appropriate Call Control or Fax application for the operation.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      nameContains: z
        .string()
        .min(3)
        .optional()
        .describe('Connection-name substring, at least three characters'),
      pageNumber: z.number().int().positive().optional(),
      pageSize: z.number().int().min(1).max(250).optional()
    })
  )
  .output(
    z.object({
      connections: z.array(
        z.object({
          connectionId: z.string(),
          name: z.string(),
          type: z.string(),
          active: z.boolean(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalResults: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new TelnyxClient(ctx.auth).listConnections(ctx.input);
    const connections = result.data.map(connection => ({
      connectionId: connection.id,
      name: connection.connection_name,
      type: connection.record_type,
      active: connection.active,
      createdAt: connection.created_at,
      updatedAt: connection.updated_at
    }));
    return {
      output: {
        connections,
        totalResults: result.meta?.total_results,
        totalPages: result.meta?.total_pages
      },
      message: `Read ${connections.length} connection(s). Connection metadata does not identify the API-key owner.`
    };
  })
  .build();
