import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import { records } from '../lib/validation';
import { spec } from '../spec';

export let listConnectionsTool = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `List connections to third-party applications in the Workato workspace. Filter by folder, project, or update time. Returns connection metadata including authorization status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Filter by folder ID'),
      projectId: z.string().optional().describe('Filter by project ID'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return connections updated after this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      connections: z.array(
        z.object({
          connectionId: z.number().optional().describe('Connection ID'),
          name: z.string().optional().describe('Connection name'),
          application: z.string().optional().describe('Application/provider name'),
          authorizationStatus: z
            .string()
            .nullable()
            .optional()
            .describe('Authorization status (e.g. "success")'),
          authorizationError: z
            .string()
            .nullable()
            .optional()
            .describe('Authorization error if any'),
          folderId: z.number().nullable().optional().describe('Folder ID'),
          projectId: z.number().nullable().optional().describe('Project ID'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const result = await client.listConnections(ctx.input);
    const connections = records(result.items).map(map.connection);
    return { output: { connections }, message: `Returned ${connections.length} connections.` };
  });
