import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let manageGroups = SlateTool.create(spec, {
  name: 'Manage Groups',
  key: 'manage_groups',
  description: `List, create, or delete groups within a database connection. Groups control user access at the table and field level. Also supports adding and removing users from groups.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'delete', 'add_user', 'remove_user', 'list_users'])
        .describe('Action to perform'),
      connectionId: z.string().describe('ID of the database connection'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID (required for delete, add_user, remove_user, list_users)'),
      title: z.string().optional().describe('Group title (required for create)'),
      email: z.string().optional().describe('User email (required for add_user, remove_user)')
    })
  )
  .output(
    z.object({
      groups: z.array(z.record(z.string(), z.unknown())).optional().describe('List of groups'),
      group: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Created or affected group'),
      users: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Users in the group'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, connectionId, groupId, title, email } = ctx.input;

    if (action === 'list') {
      let groups = await client.listGroups(connectionId);
      return {
        output: { groups, success: true },
        message: `Found **${groups.length}** group(s).`
      };
    }

    if (action === 'create') {
      if (!title) throw new Error('title is required for creating a group');
      let group = await client.createGroup(connectionId, title);
      return {
        output: { group, success: true },
        message: `Group **${title}** created successfully.`
      };
    }

    if (action === 'delete') {
      if (!groupId) throw new Error('groupId is required for deleting a group');
      await client.deleteGroup(connectionId, groupId);
      return {
        output: { success: true },
        message: `Group **${groupId}** deleted successfully.`
      };
    }

    if (action === 'add_user') {
      if (!groupId) throw new Error('groupId is required');
      if (!email) throw new Error('email is required');
      let group = await client.addUserToGroup(groupId, email);
      return {
        output: { group, success: true },
        message: `User **${email}** added to group **${groupId}**.`
      };
    }

    if (action === 'remove_user') {
      if (!groupId) throw new Error('groupId is required');
      if (!email) throw new Error('email is required');
      await client.removeUserFromGroup(groupId, email);
      return {
        output: { success: true },
        message: `User **${email}** removed from group **${groupId}**.`
      };
    }

    if (action === 'list_users') {
      if (!groupId) throw new Error('groupId is required');
      let users = await client.getUsersInGroup(groupId);
      return {
        output: { users, success: true },
        message: `Found **${users.length}** user(s) in group **${groupId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
