import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createWorkspaceTool = SlateTool.create(spec, {
  name: 'Create Workspace',
  key: 'create_workspace',
  description: `Create a new Airbyte workspace. Workspaces are the organizational unit for grouping sources, destinations, and connections.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the new workspace.'),
      organizationId: z
        .string()
        .optional()
        .describe('UUID of the organization to associate the workspace with.')
    })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      name: z.string(),
      dataResidency: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let workspace = await client.createWorkspace({
      name: ctx.input.name,
      organizationId: ctx.input.organizationId
    });

    return {
      output: {
        workspaceId: workspace.workspaceId,
        name: workspace.name,
        dataResidency: workspace.dataResidency
      },
      message: `Created workspace **${workspace.name}** (ID: ${workspace.workspaceId}).`
    };
  })
  .build();
