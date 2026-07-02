import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `List clients in a Toggl workspace. Clients group projects together for billing and reporting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Uses the configured default if not provided.'),
      status: z
        .enum(['active', 'archived', 'both'])
        .optional()
        .describe('Filter by client status'),
      name: z.string().optional().describe('Filter by client name')
    })
  )
  .output(
    z.object({
      clients: z
        .array(
          z.object({
            clientId: z.number().describe('Client ID'),
            name: z.string().describe('Client name'),
            archived: z.boolean().describe('Whether archived'),
            notes: z.string().nullable().describe('Client notes'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of clients'),
      totalCount: z.number().describe('Number of clients returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    let raw = await client.listClients(wsId, {
      status: ctx.input.status,
      name: ctx.input.name
    });

    let clients = (raw ?? []).map((c: any) => ({
      clientId: c.id,
      name: c.name,
      archived: c.archived ?? false,
      notes: c.notes ?? null,
      createdAt: c.created_at ?? c.at
    }));

    return {
      output: { clients, totalCount: clients.length },
      message: `Found **${clients.length}** clients`
    };
  })
  .build();
