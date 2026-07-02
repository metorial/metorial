import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Retrieve groups from ChMeetings. Can list all groups across the account or filter by a specific organization. When filtering by organization, supports search and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe('Filter groups by organization ID. If omitted, returns all groups.'),
      searchText: z
        .string()
        .optional()
        .describe('Search groups by name (organization filter required)'),
      page: z
        .number()
        .optional()
        .describe('Page number (default: 1, organization filter required)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (default: 100, organization filter required)')
    })
  )
  .output(
    z.object({
      groups: z.array(z.record(z.string(), z.unknown())).describe('List of group records'),
      page: z.number().optional().describe('Current page number'),
      pageSize: z.number().optional().describe('Page size'),
      total: z.number().optional().describe('Total number of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.organizationId) {
      let result = await client.listGroupsByOrganization(ctx.input.organizationId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        searchText: ctx.input.searchText
      });

      return {
        output: {
          groups: result.data as Record<string, unknown>[],
          page: result.page,
          pageSize: result.page_size,
          total: result.total
        },
        message: `Found **${result.total}** group(s) in organization **${ctx.input.organizationId}**. Showing page ${result.page}.`
      };
    }

    let result = await client.listGroups();

    return {
      output: {
        groups: result.data as unknown as Record<string, unknown>[]
      },
      message: `Retrieved **${(result.data as unknown[]).length}** group(s).`
    };
  })
  .build();

export let getGroupMembers = SlateTool.create(spec, {
  name: 'Get Group Members',
  key: 'get_group_members',
  description: `Retrieve the members of one or more groups. Can look up members across multiple groups at once by providing comma-separated group IDs, or list members of a specific group within an organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupIds: z
        .string()
        .optional()
        .describe('Comma-separated group IDs to retrieve members across multiple groups'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID (for org-scoped group membership lookup)'),
      groupId: z
        .number()
        .optional()
        .describe('Group ID (for org-scoped group membership lookup)'),
      page: z.number().optional().describe('Page number (default: 1, org-scoped only)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (default: 100, org-scoped only)')
    })
  )
  .output(
    z.object({
      members: z.array(z.record(z.string(), z.unknown())).describe('List of group members'),
      page: z.number().optional().describe('Current page number'),
      pageSize: z.number().optional().describe('Page size'),
      total: z.number().optional().describe('Total number of members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.organizationId && ctx.input.groupId) {
      let result = await client.listGroupMemberships(
        ctx.input.organizationId,
        ctx.input.groupId,
        {
          page: ctx.input.page,
          pageSize: ctx.input.pageSize
        }
      );

      return {
        output: {
          members: result.data as Record<string, unknown>[],
          page: result.page,
          pageSize: result.page_size,
          total: result.total
        },
        message: `Found **${result.total}** member(s) in group **${ctx.input.groupId}**. Showing page ${result.page}.`
      };
    }

    if (ctx.input.groupIds) {
      let result = await client.getGroupPeople(ctx.input.groupIds);

      return {
        output: {
          members: result.data as unknown as Record<string, unknown>[]
        },
        message: `Retrieved members for groups **${ctx.input.groupIds}**.`
      };
    }

    throw new Error('Provide either groupIds or both organizationId and groupId');
  })
  .build();

export let manageGroupMembership = SlateTool.create(spec, {
  name: 'Manage Group Membership',
  key: 'manage_group_membership',
  description: `Add or remove a person from a group. Use **action** to specify whether to add or remove.`
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group'),
      personId: z.number().describe('ID of the person to add or remove'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the person')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      membership: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Membership record (for add action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'add') {
      let result = await client.addPersonToGroup(ctx.input.groupId, ctx.input.personId);
      return {
        output: {
          success: true,
          membership: result.data as Record<string, unknown>
        },
        message: `Added person **${ctx.input.personId}** to group **${ctx.input.groupId}**.`
      };
    }

    await client.removePersonFromGroup(ctx.input.groupId, ctx.input.personId);
    return {
      output: {
        success: true
      },
      message: `Removed person **${ctx.input.personId}** from group **${ctx.input.groupId}**.`
    };
  })
  .build();
