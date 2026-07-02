import { SlateTool } from 'slates';
import { z } from 'zod';
import { createCognitoClient, formatAttributes } from '../lib/helpers';
import { spec } from '../spec';

export let manageGroupMembership = SlateTool.create(spec, {
  name: 'Manage Group Membership',
  key: 'manage_group_membership',
  description: `Add or remove users from groups, list users in a group, or list groups for a user. Provides complete group membership management for role-based access control.`,
  tags: {}
})
  .input(
    z.object({
      action: z
        .enum(['add_user', 'remove_user', 'list_users_in_group', 'list_groups_for_user'])
        .describe('Operation to perform'),
      userPoolId: z.string().describe('User pool ID'),
      username: z
        .string()
        .optional()
        .describe('Username (required for add_user, remove_user, list_groups_for_user)'),
      groupName: z
        .string()
        .optional()
        .describe('Group name (required for add_user, remove_user, list_users_in_group)'),
      limit: z.number().min(1).max(60).optional().describe('Max results for list operations'),
      nextToken: z.string().optional().describe('Pagination token for list operations')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional(),
      users: z
        .array(
          z.object({
            username: z.string(),
            attributes: z.record(z.string(), z.string()),
            enabled: z.boolean(),
            userStatus: z.string()
          })
        )
        .optional(),
      groups: z
        .array(
          z.object({
            groupName: z.string(),
            description: z.string().optional(),
            precedence: z.number().optional()
          })
        )
        .optional(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createCognitoClient(ctx);
    let { action, userPoolId } = ctx.input;

    if (action === 'add_user') {
      if (!ctx.input.username || !ctx.input.groupName)
        throw new Error('username and groupName are required');
      await client.adminAddUserToGroup(userPoolId, ctx.input.username, ctx.input.groupName);
      return {
        output: { success: true },
        message: `Added user **${ctx.input.username}** to group **${ctx.input.groupName}**.`
      };
    }

    if (action === 'remove_user') {
      if (!ctx.input.username || !ctx.input.groupName)
        throw new Error('username and groupName are required');
      await client.adminRemoveUserFromGroup(
        userPoolId,
        ctx.input.username,
        ctx.input.groupName
      );
      return {
        output: { success: true },
        message: `Removed user **${ctx.input.username}** from group **${ctx.input.groupName}**.`
      };
    }

    if (action === 'list_users_in_group') {
      if (!ctx.input.groupName) throw new Error('groupName is required');
      let result = await client.listUsersInGroup(
        userPoolId,
        ctx.input.groupName,
        ctx.input.limit,
        ctx.input.nextToken
      );

      let users = (result.Users || []).map((u: any) => ({
        username: u.Username,
        attributes: formatAttributes(u.Attributes || []),
        enabled: u.Enabled,
        userStatus: u.UserStatus
      }));

      return {
        output: { users, nextToken: result.NextToken },
        message: `Found **${users.length}** user(s) in group **${ctx.input.groupName}**.`
      };
    }

    if (action === 'list_groups_for_user') {
      if (!ctx.input.username) throw new Error('username is required');
      let result = await client.adminListGroupsForUser(
        userPoolId,
        ctx.input.username,
        ctx.input.limit,
        ctx.input.nextToken
      );

      let groups = (result.Groups || []).map((g: any) => ({
        groupName: g.GroupName,
        description: g.Description,
        precedence: g.Precedence
      }));

      return {
        output: { groups, nextToken: result.NextToken },
        message: `User **${ctx.input.username}** belongs to **${groups.length}** group(s).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
