import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapWorkspace } from '../lib/mappers';
import { spec } from '../spec';

export let getWorkspaceTool = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: `Get detailed information about a specific workspace by its ID or name. Returns full workspace configuration including execution mode, Terraform version, VCS settings, lock status, and resource count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('The workspace ID (e.g., ws-xxxxx). Provide either this or workspaceName.'),
      workspaceName: z
        .string()
        .optional()
        .describe('The workspace name. Provide either this or workspaceId.')
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
    let response: any;

    if (ctx.input.workspaceId) {
      response = await client.getWorkspace(ctx.input.workspaceId);
    } else if (ctx.input.workspaceName) {
      response = await client.getWorkspaceByName(ctx.input.workspaceName);
    } else {
      throw new Error('Either workspaceId or workspaceName must be provided');
    }

    let workspace = mapWorkspace(response.data);

    return {
      output: workspace,
      message: `Workspace **${workspace.name}** (${workspace.workspaceId}) — execution mode: ${workspace.executionMode}, locked: ${workspace.locked}, resources: ${workspace.resourceCount}.`
    };
  })
  .build();
