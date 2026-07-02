import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapWorkspace } from '../lib/mappers';
import { spec } from '../spec';

export let createWorkspaceTool = SlateTool.create(spec, {
  name: 'Create Workspace',
  key: 'create_workspace',
  description: `Create a new Terraform workspace. Configure execution mode, Terraform version, auto-apply behavior, and optionally connect to a VCS repository for automatic run triggers.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('Name of the workspace. Must be unique within the organization.'),
      description: z.string().optional().describe('Description of the workspace'),
      autoApply: z
        .boolean()
        .optional()
        .describe('Whether to automatically apply successful plans (default: false)'),
      executionMode: z
        .enum(['remote', 'local', 'agent'])
        .optional()
        .describe('Execution mode for the workspace'),
      terraformVersion: z
        .string()
        .optional()
        .describe('Terraform version to use (e.g., "1.5.0")'),
      workingDirectory: z
        .string()
        .optional()
        .describe('Relative path within the repo for Terraform config files'),
      projectId: z
        .string()
        .optional()
        .describe('ID of the project to assign this workspace to'),
      vcsRepo: z
        .object({
          identifier: z.string().describe('VCS repository identifier (e.g., "owner/repo")'),
          oauthTokenId: z.string().describe('OAuth token ID for VCS connection'),
          branch: z
            .string()
            .optional()
            .describe('Branch to track (defaults to repo default branch)')
        })
        .optional()
        .describe('VCS repository connection settings')
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
    let response = await client.createWorkspace(ctx.input);
    let workspace = mapWorkspace(response.data);

    return {
      output: workspace,
      message: `Created workspace **${workspace.name}** (${workspace.workspaceId}) with execution mode: ${workspace.executionMode}.`
    };
  })
  .build();
