import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapWorkspace } from '../lib/mappers';
import { spec } from '../spec';

export let updateWorkspaceTool = SlateTool.create(spec, {
  name: 'Update Workspace',
  key: 'update_workspace',
  description: `Update an existing workspace's settings. Modify name, description, execution mode, Terraform version, auto-apply behavior, or working directory. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('The ID of the workspace to update'),
      name: z.string().optional().describe('New name for the workspace'),
      description: z.string().optional().describe('New description'),
      autoApply: z
        .boolean()
        .optional()
        .describe('Whether to automatically apply successful plans'),
      executionMode: z
        .enum(['remote', 'local', 'agent'])
        .optional()
        .describe('Execution mode for the workspace'),
      terraformVersion: z.string().optional().describe('Terraform version to use'),
      workingDirectory: z
        .string()
        .optional()
        .describe('Relative path for Terraform config files')
    })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      name: z.string(),
      description: z.string(),
      autoApply: z.boolean(),
      executionMode: z.string(),
      terraformVersion: z.string(),
      workingDirectory: z.string(),
      locked: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string(),
      resourceCount: z.number(),
      vcsRepoIdentifier: z.string(),
      projectId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { workspaceId, ...updates } = ctx.input;
    let response = await client.updateWorkspace(workspaceId, updates);
    let workspace = mapWorkspace(response.data);

    return {
      output: workspace,
      message: `Updated workspace **${workspace.name}** (${workspace.workspaceId}).`
    };
  })
  .build();
