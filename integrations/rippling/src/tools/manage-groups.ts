import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

let groupOutputSchema = z.object({
  groupId: z.string().describe('Unique group identifier'),
  name: z.string().optional().describe('Group name'),
  spokeId: z.string().optional().describe('Third-party application identifier for the group'),
  userIds: z.array(z.string()).optional().describe('User IDs of group members'),
  version: z.number().optional().describe('Group version number')
});

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new employee group in Rippling associated with a third-party application. Groups represent subsets of employees and can be used for department segmentation, mailing lists, access control, etc.`,
  instructions: [
    'The spokeId must be a unique identifier within your application for this group.',
    'Provide an array of user IDs to assign initial members to the group.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new group'),
      spokeId: z
        .string()
        .describe('Unique identifier for the group in your third-party application'),
      userIds: z.array(z.string()).describe('Array of user IDs to include in the group')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let group = await client.createGroup({
      name: ctx.input.name,
      spokeId: ctx.input.spokeId,
      userIds: ctx.input.userIds
    });

    return {
      output: {
        groupId: group.id || group.groupId || '',
        name: group.name,
        spokeId: group.spokeId,
        userIds: group.userIds || group.users,
        version: group.version
      },
      message: `Created group **${ctx.input.name}** with ${ctx.input.userIds.length} member(s).`
    };
  })
  .build();

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Retrieve details about a specific group including its name, spoke ID, member user IDs, and version.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('Unique identifier of the group to retrieve')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let group = await client.getGroup(ctx.input.groupId);

    return {
      output: {
        groupId: group.id || group.groupId || ctx.input.groupId,
        name: group.name,
        spokeId: group.spokeId,
        userIds: group.userIds || group.users,
        version: group.version
      },
      message: `Retrieved group **${group.name || ctx.input.groupId}** with ${(group.userIds || group.users || []).length} member(s).`
    };
  })
  .build();

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update an existing group's name, spoke ID, or member list. Provide the group ID and any fields to update.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('Unique identifier of the group to update'),
      name: z.string().optional().describe('New name for the group'),
      spokeId: z.string().optional().describe('New spoke ID for the group'),
      userIds: z
        .array(z.string())
        .optional()
        .describe('Updated array of user IDs for the group'),
      version: z
        .number()
        .optional()
        .describe('Current version number for optimistic concurrency')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let group = await client.updateGroup(ctx.input.groupId, {
      name: ctx.input.name,
      spokeId: ctx.input.spokeId,
      users: ctx.input.userIds,
      version: ctx.input.version
    });

    return {
      output: {
        groupId: group.id || group.groupId || ctx.input.groupId,
        name: group.name,
        spokeId: group.spokeId,
        userIds: group.userIds || group.users,
        version: group.version
      },
      message: `Updated group **${group.name || ctx.input.groupId}**.`
    };
  })
  .build();

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Delete a group from Rippling. This permanently removes the group and its member associations.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('Unique identifier of the group to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the group was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    await client.deleteGroup(ctx.input.groupId);

    return {
      output: { success: true },
      message: `Deleted group **${ctx.input.groupId}**.`
    };
  })
  .build();
