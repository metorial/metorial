import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let groupInput = z.object({
  groupName: z.string().describe('Name of the group'),
  groupId: z.string().optional().describe('ID of the group (optional)')
});

let workspaceRelationInput = z.object({
  workspaceId: z.string().describe('UUID of the workspace'),
  workspaceName: z.string().optional().describe('Name of the workspace'),
  status: z.enum(['active', 'archived']).optional().describe('User status in this workspace'),
  groups: z.array(groupInput).optional().describe('Groups to assign the user to')
});

export let manageUserWorkspaces = SlateTool.create(spec, {
  name: 'Manage User Workspaces',
  key: 'manage_user_workspaces',
  description: `Replace all workspace relations for a user or update a single workspace relation. Use **replaceAll** mode to set the complete list of workspace assignments (an empty array removes all). Use **updateOne** mode to update a specific workspace relation including status and group assignments.`,
  instructions: [
    'To remove all workspace relations, use replaceAll mode with an empty workspaces array.',
    'When using updateOne mode, provide the targetWorkspaceId to identify which workspace relation to update.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('UUID of the user whose workspace relations to manage'),
      mode: z
        .enum(['replaceAll', 'updateOne'])
        .describe(
          'Operation mode: replaceAll replaces all workspace relations, updateOne updates a single relation'
        ),
      workspaces: z
        .array(workspaceRelationInput)
        .optional()
        .describe('Workspace relations to set (used with replaceAll mode)'),
      targetWorkspaceId: z
        .string()
        .optional()
        .describe('UUID of the specific workspace to update (used with updateOne mode)'),
      updateStatus: z
        .enum(['active', 'archived'])
        .optional()
        .describe('New status for the workspace relation (used with updateOne mode)'),
      updateGroups: z
        .array(groupInput)
        .optional()
        .describe('New group assignments (used with updateOne mode)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    if (ctx.input.mode === 'replaceAll') {
      let apiWorkspaces = (ctx.input.workspaces ?? []).map(w => ({
        id: w.workspaceId,
        name: w.workspaceName,
        status: w.status,
        groups: w.groups?.map(g => ({
          id: g.groupId,
          name: g.groupName
        }))
      }));

      await client.replaceUserWorkspaces(ctx.input.userId, apiWorkspaces);

      return {
        output: { success: true },
        message: `Replaced all workspace relations for user ${ctx.input.userId}. Set **${apiWorkspaces.length}** workspace(s).`
      };
    } else {
      if (!ctx.input.targetWorkspaceId) {
        throw new Error('targetWorkspaceId is required when using updateOne mode');
      }

      let body: any = {};
      if (ctx.input.updateStatus) body.status = ctx.input.updateStatus;
      if (ctx.input.updateGroups) {
        body.groups = ctx.input.updateGroups.map(g => ({
          id: g.groupId,
          name: g.groupName
        }));
      }

      await client.updateUserWorkspace(ctx.input.userId, ctx.input.targetWorkspaceId, body);

      return {
        output: { success: true },
        message: `Updated workspace relation for user ${ctx.input.userId} in workspace ${ctx.input.targetWorkspaceId}.`
      };
    }
  })
  .build();
