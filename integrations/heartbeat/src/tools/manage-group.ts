import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Creates a new group or manages group membership in your Heartbeat community. Can create groups, add users to groups, or remove users from groups. When adding a user, you can optionally remove them from sibling groups (groups sharing a parent), useful for moving users between stages.`,
  instructions: [
    'Membership changes first look up the user ID with the same API key to resolve the documented email body. A failed lookup stops the request before any mutation. Group creation returns IDs and names only when Heartbeat actually supplies them.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'add_user', 'remove_user']).describe('Action to perform'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID (required for add_user and remove_user)'),
      userId: z
        .string()
        .optional()
        .describe('User ID to add or remove (required for add_user and remove_user)'),
      removeFromSiblingGroups: z
        .boolean()
        .optional()
        .describe(
          'When adding a user, remove them from sibling groups (groups with the same parent)'
        ),
      name: z.string().optional().describe('Group name (required for create)'),
      description: z.string().optional().describe('Group description (for create)'),
      parentGroupId: z.string().optional().describe('Parent group ID (for create)'),
      isJoinable: z
        .boolean()
        .optional()
        .describe('Whether users can join the group themselves (for create)')
    })
  )
  .output(
    z.object({
      groupId: z.string().optional().describe('ID of the group'),
      groupName: z.string().optional().describe('Name of the group'),
      action: z.string().describe('Action that was performed'),
      raw: z.unknown().optional().describe('Complete provider mutation response, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw createApiServiceError('Group name is required for create action');
      }
      let group = await client.createGroup({
        name: ctx.input.name,
        description: ctx.input.description,
        parentGroupId: ctx.input.parentGroupId,
        isJoinable: ctx.input.isJoinable
      });
      return {
        output: {
          groupId: group.id,
          groupName: group.name,
          action: 'created',
          raw: group.raw
        },
        message: `Heartbeat accepted creation of group **${ctx.input.name}**.`
      };
    }

    if (ctx.input.action === 'add_user') {
      if (!ctx.input.groupId || !ctx.input.userId) {
        throw createApiServiceError('groupId and userId are required for add_user action');
      }
      let response = await client.addUserToGroup(ctx.input.groupId, {
        userId: ctx.input.userId,
        removeFromSiblingGroups: ctx.input.removeFromSiblingGroups
      });
      return {
        output: {
          groupId: ctx.input.groupId,
          action: 'user_added',
          raw: response
        },
        message: `Added user **${ctx.input.userId}** to group **${ctx.input.groupId}**.${ctx.input.removeFromSiblingGroups ? ' Removed from sibling groups.' : ''}`
      };
    }

    if (ctx.input.action === 'remove_user') {
      if (!ctx.input.groupId || !ctx.input.userId) {
        throw createApiServiceError('groupId and userId are required for remove_user action');
      }
      let response = await client.removeUserFromGroup(ctx.input.groupId, ctx.input.userId);
      return {
        output: {
          groupId: ctx.input.groupId,
          action: 'user_removed',
          raw: response
        },
        message: `Removed user **${ctx.input.userId}** from group **${ctx.input.groupId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
