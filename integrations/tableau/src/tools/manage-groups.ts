import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageGroups = SlateTool.create(spec, {
  name: 'Manage Groups',
  key: 'manage_groups',
  description: `List, create, update, delete groups, and add or remove users from groups. Use the **action** field to select the operation.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete', 'addUser', 'removeUser', 'listUsers'])
        .describe('Operation to perform'),
      groupId: z
        .string()
        .optional()
        .describe('Group LUID (required for update, delete, addUser, removeUser, listUsers)'),
      userId: z.string().optional().describe('User LUID (for addUser, removeUser)'),
      name: z.string().optional().describe('Group name (for create, update)'),
      minimumSiteRole: z
        .string()
        .optional()
        .describe('Minimum site role for group members (for create, update)'),
      pageSize: z.number().optional().describe('Number of items per page'),
      pageNumber: z.number().optional().describe('Page number (1-based)'),
      filter: z.string().optional().describe('Filter expression for list'),
      sort: z.string().optional().describe('Sort expression for list')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string(),
            name: z.string().optional(),
            minimumSiteRole: z.string().optional()
          })
        )
        .optional(),
      group: z
        .object({
          groupId: z.string(),
          name: z.string().optional(),
          minimumSiteRole: z.string().optional()
        })
        .optional(),
      users: z
        .array(
          z.object({
            userId: z.string(),
            name: z.string().optional(),
            siteRole: z.string().optional()
          })
        )
        .optional(),
      totalCount: z.number().optional(),
      deleted: z.boolean().optional(),
      userAdded: z.boolean().optional(),
      userRemoved: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.queryGroups({
        pageSize: ctx.input.pageSize,
        pageNumber: ctx.input.pageNumber,
        filter: ctx.input.filter,
        sort: ctx.input.sort
      });
      let pagination = result.pagination || {};
      let groups = (result.groups?.group || []).map((g: any) => ({
        groupId: g.id,
        name: g.name,
        minimumSiteRole: g.minimumSiteRole
      }));
      return {
        output: { groups, totalCount: Number(pagination.totalAvailable || 0) },
        message: `Found **${groups.length}** groups (${pagination.totalAvailable || 0} total).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw tableauServiceError('name is required for create action.');

      let g = await client.createGroup(ctx.input.name, ctx.input.minimumSiteRole);
      return {
        output: { group: { groupId: g.id, name: g.name, minimumSiteRole: g.minimumSiteRole } },
        message: `Created group **${g.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.groupId)
        throw tableauServiceError('groupId is required for update action.');
      if (ctx.input.name === undefined && ctx.input.minimumSiteRole === undefined) {
        throw tableauServiceError('Provide name or minimumSiteRole to update a group.');
      }

      let g = await client.updateGroup(ctx.input.groupId, {
        name: ctx.input.name,
        minimumSiteRole: ctx.input.minimumSiteRole
      });
      return {
        output: { group: { groupId: g.id, name: g.name, minimumSiteRole: g.minimumSiteRole } },
        message: `Updated group **${g.name}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.groupId)
        throw tableauServiceError('groupId is required for delete action.');

      await client.deleteGroup(ctx.input.groupId);
      return {
        output: { deleted: true },
        message: `Deleted group \`${ctx.input.groupId}\`.`
      };
    }

    if (action === 'addUser') {
      if (!ctx.input.groupId)
        throw tableauServiceError('groupId is required for addUser action.');
      if (!ctx.input.userId)
        throw tableauServiceError('userId is required for addUser action.');

      await client.addUserToGroup(ctx.input.groupId, ctx.input.userId);
      return {
        output: { userAdded: true },
        message: `Added user \`${ctx.input.userId}\` to group \`${ctx.input.groupId}\`.`
      };
    }

    if (action === 'removeUser') {
      if (!ctx.input.groupId) {
        throw tableauServiceError('groupId is required for removeUser action.');
      }
      if (!ctx.input.userId)
        throw tableauServiceError('userId is required for removeUser action.');

      await client.removeUserFromGroup(ctx.input.groupId, ctx.input.userId);
      return {
        output: { userRemoved: true },
        message: `Removed user \`${ctx.input.userId}\` from group \`${ctx.input.groupId}\`.`
      };
    }

    if (action === 'listUsers') {
      if (!ctx.input.groupId) {
        throw tableauServiceError('groupId is required for listUsers action.');
      }

      let result = await client.getUsersInGroup(ctx.input.groupId, {
        pageSize: ctx.input.pageSize,
        pageNumber: ctx.input.pageNumber
      });
      let pagination = result.pagination || {};
      let users = (result.users?.user || []).map((u: any) => ({
        userId: u.id,
        name: u.name,
        siteRole: u.siteRole
      }));
      return {
        output: { users, totalCount: Number(pagination.totalAvailable || 0) },
        message: `Found **${users.length}** users in group (${pagination.totalAvailable || 0} total).`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
