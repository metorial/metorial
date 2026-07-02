import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userGroupOutputSchema = z.object({
  groupId: z.string(),
  name: z.string(),
  userIds: z.array(z.string()).optional()
});

export let createUserGroup = SlateTool.create(spec, {
  name: 'Create User Group',
  key: 'create_user_group',
  description: `Create a new user group in the Clockify workspace. Groups can be used for project membership and scheduling.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the user group')
    })
  )
  .output(userGroupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let group = await client.createUserGroup({ name: ctx.input.name });

    return {
      output: {
        groupId: group.id,
        name: group.name,
        userIds: group.userIds?.length ? group.userIds : undefined
      },
      message: `Created user group **${group.name}**.`
    };
  })
  .build();

export let getUserGroups = SlateTool.create(spec, {
  name: 'Get User Groups',
  key: 'get_user_groups',
  description: `List user groups in the Clockify workspace. Filter by name.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by group name'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Entries per page')
    })
  )
  .output(
    z.object({
      groups: z.array(userGroupOutputSchema),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let groups = await client.getUserGroups({
      name: ctx.input.name,
      page: ctx.input.page,
      'page-size': ctx.input.pageSize
    });

    let mapped = (groups as any[]).map((g: any) => ({
      groupId: g.id,
      name: g.name,
      userIds: g.userIds?.length ? g.userIds : undefined
    }));

    return {
      output: { groups: mapped, count: mapped.length },
      message: `Retrieved **${mapped.length}** user groups.`
    };
  })
  .build();

export let updateUserGroup = SlateTool.create(spec, {
  name: 'Update User Group',
  key: 'update_user_group',
  description: `Update a user group name, or add/remove users from the group.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the user group'),
      name: z.string().optional().describe('Updated group name'),
      addUserIds: z.array(z.string()).optional().describe('User IDs to add to the group'),
      removeUserIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to remove from the group')
    })
  )
  .output(userGroupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    if (ctx.input.name) {
      await client.updateUserGroup(ctx.input.groupId, { name: ctx.input.name });
    }

    if (ctx.input.addUserIds) {
      for (let userId of ctx.input.addUserIds) {
        await client.addUserToGroup(ctx.input.groupId, userId);
      }
    }

    if (ctx.input.removeUserIds) {
      for (let userId of ctx.input.removeUserIds) {
        await client.removeUserFromGroup(ctx.input.groupId, userId);
      }
    }

    // Fetch updated group
    let groups = await client.getUserGroups();
    let group = (groups as any[]).find((g: any) => g.id === ctx.input.groupId);

    return {
      output: {
        groupId: group?.id || ctx.input.groupId,
        name: group?.name || ctx.input.name || '',
        userIds: group?.userIds?.length ? group.userIds : undefined
      },
      message: `Updated user group **${group?.name || ctx.input.groupId}**.`
    };
  })
  .build();

export let deleteUserGroup = SlateTool.create(spec, {
  name: 'Delete User Group',
  key: 'delete_user_group',
  description: `Delete a user group from the Clockify workspace.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the user group to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    await client.deleteUserGroup(ctx.input.groupId);

    return {
      output: { deleted: true },
      message: `Deleted user group **${ctx.input.groupId}**.`
    };
  })
  .build();
