import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

let workspaceSchema = z.object({
  workspaceId: z.string().describe('Workspace ID'),
  name: z.string().describe('Workspace name'),
  kind: z.string().nullable().describe('Workspace type (open or closed)'),
  description: z.string().nullable().describe('Workspace description'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  state: z.string().nullable().describe('Workspace state'),
  isDefault: z.boolean().nullable().describe('Whether this is the default workspace')
});

export let listWorkspacesTool = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `Retrieve workspaces from the Monday.com account. Workspaces are organizational containers that hold boards, dashboards, and folders.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceIds: z
        .array(z.string())
        .optional()
        .describe('Specific workspace IDs to retrieve'),
      kind: z.enum(['open', 'closed']).optional().describe('Filter by workspace type'),
      limit: z.number().optional().describe('Maximum number of workspaces to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      workspaces: z.array(workspaceSchema).describe('List of workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    let workspaces = await client.getWorkspaces({
      ids: ctx.input.workspaceIds,
      kind: ctx.input.kind,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let mapped = workspaces.map((w: any) => ({
      workspaceId: String(w.id),
      name: w.name,
      kind: w.kind || null,
      description: w.description || null,
      createdAt: w.created_at || null,
      state: w.state || null,
      isDefault: w.is_default_workspace ?? null
    }));

    return {
      output: { workspaces: mapped },
      message: `Found **${mapped.length}** workspace(s).`
    };
  })
  .build();

export let createWorkspaceTool = SlateTool.create(spec, {
  name: 'Create Workspace',
  key: 'create_workspace',
  description: `Create a new workspace in the Monday.com account.`
})
  .input(
    z.object({
      name: z.string().describe('Workspace name'),
      kind: z
        .enum(['open', 'closed'])
        .describe('Workspace type: open (visible to all) or closed (invite-only)'),
      description: z.string().optional().describe('Workspace description')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('ID of the created workspace'),
      name: z.string().describe('Workspace name'),
      kind: z.string().nullable().describe('Workspace type'),
      description: z.string().nullable().describe('Workspace description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    let workspace = await client.createWorkspace(
      ctx.input.name,
      ctx.input.kind,
      ctx.input.description
    );

    return {
      output: {
        workspaceId: String(workspace.id),
        name: workspace.name,
        kind: workspace.kind || null,
        description: workspace.description || null
      },
      message: `Created workspace **${workspace.name}** (ID: ${workspace.id}).`
    };
  })
  .build();

export let updateWorkspaceTool = SlateTool.create(spec, {
  name: 'Update Workspace',
  key: 'update_workspace',
  description: `Update a workspace's name or description, or delete the workspace entirely.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to update'),
      name: z.string().optional().describe('New workspace name'),
      description: z.string().optional().describe('New workspace description'),
      action: z
        .enum(['update', 'delete'])
        .optional()
        .default('update')
        .describe('Action to perform')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('Workspace ID'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      await client.deleteWorkspace(ctx.input.workspaceId);
      return {
        output: { workspaceId: ctx.input.workspaceId, success: true },
        message: `Deleted workspace ${ctx.input.workspaceId}.`
      };
    }

    await client.updateWorkspace(ctx.input.workspaceId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: { workspaceId: ctx.input.workspaceId, success: true },
      message: `Updated workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();
