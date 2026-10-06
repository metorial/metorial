import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { organizationNameSchema } from '../lib/contracts';
import { createClient } from '../lib/helpers';
import { mapWorkspace } from '../lib/mappers';
import { spec } from '../spec';

export let getWorkspaceTool = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: `Call list_organizations to select an organization or use the optional configured default. Get detailed information about a specific workspace by its ID or name. Returns full workspace configuration including execution mode, Terraform version, VCS settings, lock status, and resource count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationName: organizationNameSchema,
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID (e.g., ws-xxxxx); takes precedence when workspaceName is also provided.'
        ),
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
    if (!ctx.input.workspaceId && !ctx.input.workspaceName) {
      throw createApiServiceError(
        'Either workspaceId or workspaceName must be provided. Call list_workspaces for IDs and names.'
      );
    }
    const response = ctx.input.workspaceId
      ? await client.getWorkspace(ctx.input.workspaceId)
      : await client.getWorkspaceByName(ctx.input.workspaceName ?? '');

    let workspace = mapWorkspace(response.data);

    return {
      output: workspace,
      message: `Workspace **${workspace.name}** (${workspace.workspaceId}) — execution mode: ${workspace.executionMode}, locked: ${workspace.locked}, resources: ${workspace.resourceCount}.`
    };
  })
  .build();
