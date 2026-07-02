import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Create a new group or update an existing group's name and membership. When creating, provide a name and optionally initial member user IDs. When updating, provide the group ID and any combination of new name, users to add, and users to remove.`,
  instructions: [
    'To create a group, provide "name" without "groupId".',
    'To update a group, provide "groupId" with any of "name", "addUserIds", or "removeUserIds".'
  ]
})
  .input(
    z.object({
      groupId: z
        .string()
        .optional()
        .describe('UUID of an existing group to update (omit to create a new group)'),
      name: z.string().optional().describe('Name for the group (required when creating)'),
      addUserIds: z.array(z.string()).optional().describe('User IDs to add to the group'),
      removeUserIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to remove from the group')
    })
  )
  .output(
    z.object({
      groupId: z.string(),
      name: z.string(),
      createdAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.groupId) {
      let group = await client.editGroup(ctx.input.groupId, {
        name: ctx.input.name,
        addUserIds: ctx.input.addUserIds,
        removeUserIds: ctx.input.removeUserIds
      });
      return {
        output: {
          groupId: group.groupId,
          name: group.name,
          createdAt: group.createdAt
        },
        message: `Updated group **${group.name}** (${group.groupId}).`
      };
    } else {
      if (!ctx.input.name) {
        throw new Error('Name is required when creating a new group.');
      }
      let group = await client.createGroup(ctx.input.name, ctx.input.addUserIds);
      return {
        output: {
          groupId: group.groupId,
          name: group.name,
          createdAt: group.createdAt
        },
        message: `Created group **${group.name}** (${group.groupId}).`
      };
    }
  })
  .build();
