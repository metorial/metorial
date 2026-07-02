import { SlateTool } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

let workspaceOutputSchema = z.object({
  workspaceId: z.string().optional().describe('Workspace ID'),
  accountId: z.string().optional().describe('Parent account ID'),
  containerId: z.string().optional().describe('Parent container ID'),
  name: z.string().optional().describe('Workspace name'),
  description: z.string().optional().describe('Workspace description'),
  fingerprint: z.string().optional().describe('Workspace fingerprint'),
  tagManagerUrl: z.string().optional().describe('URL to the GTM UI')
});

type MergeConflictAwareResult = {
  mergeConflict?: unknown;
  syncStatus?: {
    mergeConflict?: boolean;
  };
};

let detectMergeConflict = (result: MergeConflictAwareResult) => {
  if (Array.isArray(result.mergeConflict)) {
    return result.mergeConflict.length > 0;
  }

  return result.syncStatus?.mergeConflict === true || result.mergeConflict === true;
};

export let manageWorkspace = SlateTool.create(spec, {
  name: 'Manage Workspace',
  key: 'manage_workspace',
  description: `Create, list, update, delete, or sync GTM workspaces. Workspaces allow concurrent modifications to a container's configuration. Use "list" to see all workspaces, "sync" to pull the latest container version into a workspace, or "status" to check for pending changes.`,
  instructions: [
    'Workspaces are required for working with tags, triggers, variables, and folders.',
    'Use "sync" to update a workspace with the latest published container version.',
    'Use "status" to see what changes exist in the workspace.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleTagManagerActionScopes.manageWorkspace)
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete', 'sync', 'status'])
        .describe('Operation to perform'),
      accountId: z.string().describe('GTM account ID'),
      containerId: z.string().describe('GTM container ID'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID (required for get, update, delete, sync, status)'),
      name: z
        .string()
        .optional()
        .describe('Workspace name (required for create, optional for update)'),
      description: z.string().optional().describe('Workspace description')
    })
  )
  .output(
    z.object({
      workspace: workspaceOutputSchema
        .optional()
        .describe('Workspace details (for single-workspace operations)'),
      workspaces: z
        .array(workspaceOutputSchema)
        .optional()
        .describe('List of workspaces (for list action)'),
      changes: z
        .array(
          z.object({
            changeStatus: z.string().optional().describe('Status of the change'),
            entityType: z.string().optional().describe('Type of entity that changed')
          })
        )
        .optional()
        .describe('Workspace changes (for status action)'),
      hasMergeConflicts: z
        .boolean()
        .optional()
        .describe('Whether merge conflicts exist (for sync/status actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GtmClient(ctx.auth.token);
    let { action, accountId, containerId, workspaceId } = ctx.input;

    if (action === 'list') {
      let response = await client.listWorkspaces(accountId, containerId);
      let workspaces = response.workspace || [];
      return {
        output: { workspaces } as any,
        message: `Found **${workspaces.length}** workspace(s) in container \`${containerId}\``
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for creating a workspace');
      let workspace = await client.createWorkspace(accountId, containerId, {
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: { workspace } as any,
        message: `Created workspace **"${workspace.name}"** (ID: \`${workspace.workspaceId}\`)`
      };
    }

    if (!workspaceId)
      throw new Error(
        'workspaceId is required for get, update, delete, sync, and status actions'
      );

    if (action === 'get') {
      let workspace = await client.getWorkspace(accountId, containerId, workspaceId);
      return {
        output: { workspace } as any,
        message: `Retrieved workspace **"${workspace.name}"**`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      let workspace = await client.updateWorkspace(
        accountId,
        containerId,
        workspaceId,
        updateData
      );
      return {
        output: { workspace } as any,
        message: `Updated workspace **"${workspace.name}"**`
      };
    }

    if (action === 'delete') {
      await client.deleteWorkspace(accountId, containerId, workspaceId);
      return {
        output: { workspace: { workspaceId, accountId, containerId } } as any,
        message: `Deleted workspace \`${workspaceId}\``
      };
    }

    if (action === 'sync') {
      let syncResult = await client.syncWorkspace(accountId, containerId, workspaceId);
      let hasMergeConflicts = detectMergeConflict(syncResult as MergeConflictAwareResult);
      return {
        output: { hasMergeConflicts } as any,
        message: hasMergeConflicts
          ? `Synced workspace \`${workspaceId}\` — **merge conflicts detected**`
          : `Synced workspace \`${workspaceId}\` successfully`
      };
    }

    // status
    let statusResult = await client.getWorkspaceStatus(accountId, containerId, workspaceId);
    let changes = (statusResult.workspaceChange || []).map(entity => ({
      changeStatus: entity.changeStatus,
      entityType: entity.tag
        ? 'tag'
        : entity.trigger
          ? 'trigger'
          : entity.variable
            ? 'variable'
            : entity.folder
              ? 'folder'
              : 'other'
    }));
    let hasMergeConflicts = detectMergeConflict(statusResult as MergeConflictAwareResult);

    return {
      output: { changes, hasMergeConflicts } as any,
      message: `Workspace \`${workspaceId}\` has **${changes.length}** pending change(s)${hasMergeConflicts ? ' with **merge conflicts**' : ''}`
    };
  })
  .build();
