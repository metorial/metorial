import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateWorkspaceTool = SlateTool.create(spec, {
  name: 'Update Workspace',
  key: 'update_workspace',
  description: `Update an existing Airbyte workspace. Modify the workspace name or notification settings.`
})
  .input(
    z.object({
      workspaceId: z.string().describe('The UUID of the workspace to update.'),
      name: z.string().optional().describe('New name for the workspace.'),
      notifications: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated notification configuration for the workspace.')
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

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.notifications !== undefined)
      updateData.notifications = ctx.input.notifications;

    let workspace = await client.updateWorkspace(ctx.input.workspaceId, updateData);

    return {
      output: {
        workspaceId: workspace.workspaceId,
        name: workspace.name,
        dataResidency: workspace.dataResidency
      },
      message: `Updated workspace **${workspace.name}** (ID: ${workspace.workspaceId}).`
    };
  })
  .build();
