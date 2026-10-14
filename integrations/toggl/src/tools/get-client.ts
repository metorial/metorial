import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { workspaceIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let getClient = SlateTool.create(spec, {
  name: 'Get Client',
  key: 'get_client',
  description:
    'Retrieve a Toggl Track client by ID, including its archived state and notes. Call get_workspace to discover workspaces and list_clients to discover client IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdInput,
      clientId: z.string().describe('Client ID. Call list_clients to discover client IDs.')
    })
  )
  .output(
    z.object({
      clientId: z.number(),
      workspaceId: z.number(),
      name: z.string(),
      archived: z.boolean(),
      notes: z.string().nullable(),
      updatedAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token, ctx.auth.defaultWorkspaceId);
    let workspaceId = await client.resolveWorkspaceId(ctx.input.workspaceId, ctx.config);
    let result = await client.getClient(workspaceId, ctx.input.clientId);
    return {
      output: {
        clientId: result.id,
        workspaceId: result.wid ?? result.workspace_id ?? Number(workspaceId),
        name: result.name,
        archived: result.archived ?? false,
        notes: result.notes ?? null,
        updatedAt: result.at ?? null
      },
      message: `Retrieved client **${result.name}**`
    };
  })
  .build();
