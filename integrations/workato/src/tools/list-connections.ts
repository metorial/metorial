import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
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
          connectionId: z.number().describe('Connection ID'),
          name: z.string().describe('Connection name'),
          application: z.string().describe('Application/provider name'),
          authorizationStatus: z
            .string()
            .nullable()
            .describe('Authorization status (e.g. "success")'),
          authorizationError: z.string().nullable().describe('Authorization error if any'),
          folderId: z.number().nullable().describe('Folder ID'),
          projectId: z.number().nullable().describe('Project ID'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listConnections({
      folderId: ctx.input.folderId,
      projectId: ctx.input.projectId,
      updatedAfter: ctx.input.updatedAfter
    });

    let items = Array.isArray(result) ? result : (result.items ?? []);
    let connections = items.map((c: any) => ({
      connectionId: c.id,
      name: c.name,
      application: c.application ?? c.provider ?? '',
      authorizationStatus: c.authorization_status ?? null,
      authorizationError: c.authorization_error ?? null,
      folderId: c.folder_id ?? null,
      projectId: c.project_id ?? null,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { connections },
      message: `Found **${connections.length}** connections.`
    };
  });
