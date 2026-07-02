import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { oktaServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageAppAssignmentTool = SlateTool.create(spec, {
  name: 'Manage App Assignment',
  key: 'manage_app_assignment',
  description: `Assign or unassign users and groups to/from an Okta application. Also supports listing current user and group assignments for an app.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'assign_user',
          'unassign_user',
          'assign_group',
          'unassign_group',
          'list_users',
          'list_groups'
        ])
        .describe('Operation to perform'),
      appId: z.string().describe('Okta application ID'),
      userId: z
        .string()
        .optional()
        .describe('User ID (required for assign_user/unassign_user)'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID (required for assign_group/unassign_group)'),
      limit: z.number().optional().describe('Max items to return when listing'),
      after: z.string().optional().describe('Pagination cursor for listing')
    })
  )
  .output(
    z.object({
      appId: z.string(),
      action: z.string(),
      success: z.boolean(),
      assignedUsers: z
        .array(
          z.object({
            userId: z.string(),
            scope: z.string().optional(),
            status: z.string().optional()
          })
        )
        .optional()
        .describe('App user assignments (only for list_users)'),
      assignedGroups: z
        .array(
          z.object({
            groupId: z.string(),
            priority: z.number().optional()
          })
        )
        .optional()
        .describe('App group assignments (only for list_groups)'),
      nextCursor: z.string().optional(),
      hasMore: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let { action, appId, userId, groupId } = ctx.input;

    if (action === 'assign_user') {
      if (!userId) throw oktaServiceError('User ID is required');
      await client.assignUserToApplication(appId, { userId });
      return {
        output: { appId, action, success: true },
        message: `Assigned user \`${userId}\` to application \`${appId}\`.`
      };
    }

    if (action === 'unassign_user') {
      if (!userId) throw oktaServiceError('User ID is required');
      await client.removeUserFromApplication(appId, userId);
      return {
        output: { appId, action, success: true },
        message: `Unassigned user \`${userId}\` from application \`${appId}\`.`
      };
    }

    if (action === 'assign_group') {
      if (!groupId) throw oktaServiceError('Group ID is required');
      await client.assignGroupToApplication(appId, groupId);
      return {
        output: { appId, action, success: true },
        message: `Assigned group \`${groupId}\` to application \`${appId}\`.`
      };
    }

    if (action === 'unassign_group') {
      if (!groupId) throw oktaServiceError('Group ID is required');
      await client.removeGroupFromApplication(appId, groupId);
      return {
        output: { appId, action, success: true },
        message: `Unassigned group \`${groupId}\` from application \`${appId}\`.`
      };
    }

    if (action === 'list_users') {
      let result = await client.listApplicationUsers(appId, {
        limit: ctx.input.limit,
        after: ctx.input.after
      });

      let assignedUsers = result.items.map((u: any) => ({
        userId: u.id,
        scope: u.scope,
        status: u.status
      }));

      let nextCursor: string | undefined;
      if (result.nextUrl) {
        let url = new URL(result.nextUrl);
        nextCursor = url.searchParams.get('after') || undefined;
      }

      return {
        output: {
          appId,
          action,
          success: true,
          assignedUsers,
          nextCursor,
          hasMore: !!result.nextUrl
        },
        message: `Found **${assignedUsers.length}** user assignment(s) for app \`${appId}\`.`
      };
    }

    if (action === 'list_groups') {
      let result = await client.listApplicationGroups(appId, {
        limit: ctx.input.limit,
        after: ctx.input.after
      });

      let assignedGroups = result.items.map((g: any) => ({
        groupId: g.id,
        priority: g.priority
      }));

      let nextCursor: string | undefined;
      if (result.nextUrl) {
        let url = new URL(result.nextUrl);
        nextCursor = url.searchParams.get('after') || undefined;
      }

      return {
        output: {
          appId,
          action,
          success: true,
          assignedGroups,
          nextCursor,
          hasMore: !!result.nextUrl
        },
        message: `Found **${assignedGroups.length}** group assignment(s) for app \`${appId}\`.`
      };
    }

    throw oktaServiceError(`Unknown action: ${action}`);
  })
  .build();
