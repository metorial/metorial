import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnthropicClient } from '../lib/client';
import { anthropicServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageWorkspaces = SlateTool.create(spec, {
  name: 'Manage Workspaces',
  key: 'manage_workspaces',
  description: `Manage organization workspaces and their members via the Admin API. Create, list, update, archive workspaces, and manage workspace membership.
Use **action** to specify the operation. Requires an Admin API key (sk-ant-admin...).`,
  instructions: [
    'For "create": provide workspaceName.',
    'For "list": optionally provide limit, afterId, and includeArchived.',
    'For "get": provide workspaceId.',
    'For "update": provide workspaceId and workspaceName.',
    'For "archive": provide workspaceId.',
    'For "add_member": provide workspaceId, userId, and workspaceRole.',
    'For "list_members": provide workspaceId.',
    'For "get_member": provide workspaceId and userId.',
    'For "update_member": provide workspaceId, userId, and workspaceRole.',
    'For "remove_member": provide workspaceId and userId.'
  ],
  constraints: ['Requires an Admin API key (sk-ant-admin...).'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'list',
          'get',
          'update',
          'archive',
          'add_member',
          'list_members',
          'get_member',
          'update_member',
          'remove_member'
        ])
        .describe('Operation to perform'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID (required for most operations except create and list)'),
      workspaceName: z.string().optional().describe('Workspace name (for create, update)'),
      userId: z.string().optional().describe('User ID (for member operations)'),
      workspaceRole: z
        .enum([
          'workspace_user',
          'workspace_developer',
          'workspace_admin',
          'workspace_billing'
        ])
        .optional()
        .describe('Workspace role (for add_member, update_member)'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived workspaces in list results'),
      limit: z.number().optional().describe('Max results for list operations'),
      afterId: z.string().optional().describe('Pagination cursor for list operations')
    })
  )
  .output(
    z.object({
      workspace: z.record(z.string(), z.unknown()).optional().describe('Workspace details'),
      workspaces: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of workspaces'),
      member: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Workspace member details'),
      members: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of workspace members'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      success: z.boolean().optional().describe('Whether a remove/archive operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnthropicClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.workspaceName) {
          throw anthropicServiceError('workspaceName is required for "create"');
        }
        let workspace = await client.createWorkspace(ctx.input.workspaceName);
        return {
          output: { workspace },
          message: `Created workspace **${ctx.input.workspaceName}**.`
        };
      }
      case 'list': {
        let result = await client.listWorkspaces({
          limit: ctx.input.limit,
          afterId: ctx.input.afterId,
          includeArchived: ctx.input.includeArchived
        });
        return {
          output: { workspaces: result.workspaces, hasMore: result.hasMore },
          message: `Found **${result.workspaces.length}** workspace(s).`
        };
      }
      case 'get': {
        if (!ctx.input.workspaceId) {
          throw anthropicServiceError('workspaceId is required for "get"');
        }
        let workspace = await client.getWorkspace(ctx.input.workspaceId);
        return {
          output: { workspace },
          message: `Retrieved workspace **${ctx.input.workspaceId}**.`
        };
      }
      case 'update': {
        if (!ctx.input.workspaceId || !ctx.input.workspaceName) {
          throw anthropicServiceError(
            'workspaceId and workspaceName are required for "update"'
          );
        }
        let workspace = await client.updateWorkspace(ctx.input.workspaceId, {
          name: ctx.input.workspaceName
        });
        return {
          output: { workspace },
          message: `Updated workspace **${ctx.input.workspaceId}** name to **${ctx.input.workspaceName}**.`
        };
      }
      case 'archive': {
        if (!ctx.input.workspaceId) {
          throw anthropicServiceError('workspaceId is required for "archive"');
        }
        await client.archiveWorkspace(ctx.input.workspaceId);
        return {
          output: { success: true },
          message: `Archived workspace **${ctx.input.workspaceId}**.`
        };
      }
      case 'add_member': {
        if (!ctx.input.workspaceId || !ctx.input.userId || !ctx.input.workspaceRole) {
          throw anthropicServiceError(
            'workspaceId, userId, and workspaceRole are required for "add_member"'
          );
        }
        let member = await client.addWorkspaceMember(
          ctx.input.workspaceId,
          ctx.input.userId,
          ctx.input.workspaceRole
        );
        return {
          output: { member },
          message: `Added **${ctx.input.userId}** to workspace **${ctx.input.workspaceId}** as **${ctx.input.workspaceRole}**.`
        };
      }
      case 'list_members': {
        if (!ctx.input.workspaceId) {
          throw anthropicServiceError('workspaceId is required for "list_members"');
        }
        let result = await client.listWorkspaceMembers(ctx.input.workspaceId, {
          limit: ctx.input.limit,
          afterId: ctx.input.afterId
        });
        return {
          output: { members: result.members, hasMore: result.hasMore },
          message: `Found **${result.members.length}** member(s) in workspace **${ctx.input.workspaceId}**.`
        };
      }
      case 'get_member': {
        if (!ctx.input.workspaceId || !ctx.input.userId) {
          throw anthropicServiceError('workspaceId and userId are required for "get_member"');
        }
        let member = await client.getWorkspaceMember(ctx.input.workspaceId, ctx.input.userId);
        return {
          output: { member },
          message: `Retrieved **${ctx.input.userId}** membership in workspace **${ctx.input.workspaceId}**.`
        };
      }
      case 'update_member': {
        if (!ctx.input.workspaceId || !ctx.input.userId || !ctx.input.workspaceRole) {
          throw anthropicServiceError(
            'workspaceId, userId, and workspaceRole are required for "update_member"'
          );
        }
        let member = await client.updateWorkspaceMember(
          ctx.input.workspaceId,
          ctx.input.userId,
          ctx.input.workspaceRole
        );
        return {
          output: { member },
          message: `Updated **${ctx.input.userId}** role to **${ctx.input.workspaceRole}** in workspace **${ctx.input.workspaceId}**.`
        };
      }
      case 'remove_member': {
        if (!ctx.input.workspaceId || !ctx.input.userId) {
          throw anthropicServiceError(
            'workspaceId and userId are required for "remove_member"'
          );
        }
        await client.removeWorkspaceMember(ctx.input.workspaceId, ctx.input.userId);
        return {
          output: { success: true },
          message: `Removed **${ctx.input.userId}** from workspace **${ctx.input.workspaceId}**.`
        };
      }
    }
  })
  .build();
