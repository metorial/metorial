import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Create, update, delete groups, or manage group membership by adding/removing users.
Groups are used to organize users and grant collective access to collections.`
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'add_user', 'remove_user'])
        .describe('Action to perform'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID (required for update, delete, add_user, remove_user)'),
      name: z
        .string()
        .optional()
        .describe('Group name (required for create, optional for update)'),
      userId: z.string().optional().describe('User ID (required for add_user and remove_user)')
    })
  )
  .output(
    z.object({
      groupId: z.string(),
      name: z.string().optional(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name) throw new Error('Name is required when creating a group');
        let group = await client.createGroup({ name: ctx.input.name });
        return {
          output: { groupId: group.id, name: group.name, action, success: true },
          message: `Created group **"${group.name}"**.`
        };
      }
      case 'update': {
        if (!ctx.input.groupId) throw new Error('groupId is required when updating');
        if (!ctx.input.name) throw new Error('Name is required when updating a group');
        let group = await client.updateGroup({ id: ctx.input.groupId, name: ctx.input.name });
        return {
          output: { groupId: group.id, name: group.name, action, success: true },
          message: `Updated group **"${group.name}"**.`
        };
      }
      case 'delete': {
        if (!ctx.input.groupId) throw new Error('groupId is required when deleting');
        await client.deleteGroup(ctx.input.groupId);
        return {
          output: { groupId: ctx.input.groupId, action, success: true },
          message: `Deleted group.`
        };
      }
      case 'add_user': {
        if (!ctx.input.groupId) throw new Error('groupId is required');
        if (!ctx.input.userId) throw new Error('userId is required');
        await client.addUserToGroup(ctx.input.groupId, ctx.input.userId);
        return {
          output: { groupId: ctx.input.groupId, action, success: true },
          message: `Added user to group.`
        };
      }
      case 'remove_user': {
        if (!ctx.input.groupId) throw new Error('groupId is required');
        if (!ctx.input.userId) throw new Error('userId is required');
        await client.removeUserFromGroup(ctx.input.groupId, ctx.input.userId);
        return {
          output: { groupId: ctx.input.groupId, action, success: true },
          message: `Removed user from group.`
        };
      }
    }
  })
  .build();
