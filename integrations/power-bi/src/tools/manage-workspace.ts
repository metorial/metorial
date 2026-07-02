import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

export let manageWorkspace = SlateTool.create(spec, {
  name: 'Manage Workspace',
  key: 'manage_workspace',
  description: `Create or delete a Power BI workspace. Use **create** to provision a new workspace or **delete** to remove an existing one.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      name: z.string().optional().describe('Name for the new workspace (required for create)'),
      workspaceId: z
        .string()
        .optional()
        .describe('ID of the workspace to delete (required for delete)')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().optional().describe('ID of the created workspace'),
      name: z.string().optional().describe('Name of the created workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw new Error('Name is required when creating a workspace');
      }
      let workspace = await client.createWorkspace(ctx.input.name);
      return {
        output: {
          workspaceId: workspace.id,
          name: workspace.name
        },
        message: `Created workspace **${workspace.name}** (${workspace.id}).`
      };
    } else {
      if (!ctx.input.workspaceId) {
        throw new Error('workspaceId is required when deleting a workspace');
      }
      await client.deleteWorkspace(ctx.input.workspaceId);
      return {
        output: {
          workspaceId: ctx.input.workspaceId
        },
        message: `Deleted workspace **${ctx.input.workspaceId}**.`
      };
    }
  })
  .build();
