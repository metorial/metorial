import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  LookerClient,
  type LookerGroup,
  type LookerUser,
  type LookerWriteGroup
} from '../lib/client';
import { spec } from '../spec';

let groupOutputSchema = z.object({
  groupId: z.string().describe('Group ID'),
  name: z.string().optional().describe('Group name'),
  userCount: z.number().optional().describe('Number of users in the group'),
  containsCurrentUser: z
    .boolean()
    .optional()
    .describe('Whether the current user is in the group'),
  externallyManaged: z
    .boolean()
    .optional()
    .describe('Whether the group is externally managed'),
  externalGroupId: z.string().optional().describe('External group ID'),
  includeByDefault: z
    .boolean()
    .optional()
    .describe('Whether new users are added to the group by default'),
  canAddToContentMetadata: z
    .boolean()
    .optional()
    .describe('Whether the group can be used in content access controls'),
  deleted: z
    .boolean()
    .optional()
    .describe('Whether this operation permanently deleted the group')
});

let groupUserOutputSchema = z.object({
  userId: z.string().describe('User ID'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  displayName: z.string().optional().describe('Display name'),
  email: z.string().optional().describe('Email address'),
  isDisabled: z.boolean().optional().describe('Whether the user is disabled')
});

let mapGroup = (group: LookerGroup) => {
  if (typeof group?.id !== 'string' || group.id.length === 0) {
    throw createApiServiceError('Looker returned a group without an ID.', {
      reason: 'looker_group_response_invalid'
    });
  }

  return {
    groupId: group.id,
    name: group.name ?? undefined,
    userCount: group.user_count ?? undefined,
    containsCurrentUser: group.contains_current_user ?? undefined,
    externallyManaged: group.externally_managed ?? undefined,
    externalGroupId: group.external_group_id ?? undefined,
    includeByDefault: group.include_by_default ?? undefined,
    canAddToContentMetadata: group.can_add_to_content_metadata ?? undefined
  };
};

let mapGroupUser = (user: LookerUser) => {
  if (typeof user?.id !== 'string' || user.id.length === 0) {
    throw createApiServiceError('Looker returned an added user without an ID.', {
      reason: 'looker_group_user_response_invalid'
    });
  }

  return {
    userId: user.id,
    firstName: user.first_name ?? undefined,
    lastName: user.last_name ?? undefined,
    displayName: user.display_name ?? undefined,
    email: user.email ?? undefined,
    isDisabled: user.is_disabled ?? undefined
  };
};

let groupLabel = (group: ReturnType<typeof mapGroup>) => group.name ?? group.groupId;

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Get, create, update, permanently delete, or search for user groups. Groups can be used for assigning roles and managing content access. Can also add or remove users from groups.`,
  instructions: [
    'To search groups: set action to "search" with optional groupId, name, externalGroupId, externallyManaged, or externallyOrphaned filters. Use limit and offset for pagination.',
    'To get: set action to "get" with groupId.',
    'To create: set action to "create" with name and optional canAddToContentMetadata.',
    'To update: set action to "update" with groupId and at least one of name or canAddToContentMetadata.',
    'To permanently delete: set action to "delete" with groupId.',
    'To add a user: set action to "add_user" with groupId and userId.',
    'To remove a user: set action to "remove_user" with groupId and userId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'search', 'create', 'update', 'delete', 'add_user', 'remove_user'])
        .describe('Action to perform'),
      groupId: z
        .string()
        .optional()
        .describe(
          'Group ID (required for get/update/delete/membership; optional search filter)'
        ),
      name: z.string().optional().describe('Group name or search pattern'),
      externalGroupId: z.string().optional().describe('External group ID search pattern'),
      externallyManaged: z
        .boolean()
        .optional()
        .describe('Filter search results by externally managed state'),
      externallyOrphaned: z
        .boolean()
        .optional()
        .describe('Filter search results by externally orphaned state'),
      canAddToContentMetadata: z
        .boolean()
        .optional()
        .describe('Whether the group can be used in content access controls (create/update)'),
      userId: z.string().optional().describe('User ID (for add_user/remove_user)'),
      limit: z.number().int().min(0).optional().describe('Maximum search results to return'),
      offset: z.number().int().min(0).optional().describe('Search results to skip'),
      sorts: z.string().optional().describe('Fields to sort search results by'),
      filterOr: z
        .boolean()
        .optional()
        .describe('Combine search filters with OR instead of the default AND'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Deprecated 1-based search page; requires perPage'),
      perPage: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Deprecated search page size; use limit and offset')
    })
  )
  .output(
    z.object({
      group: groupOutputSchema.optional().describe('Group details'),
      groups: z.array(groupOutputSchema).optional().describe('List of groups (for search)'),
      user: groupUserOutputSchema.optional().describe('Added user details (for add_user)'),
      userId: z.string().optional().describe('Affected user ID (for add_user or remove_user)'),
      count: z.number().optional().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.groupId) {
          throw createApiServiceError('groupId is required for get action.', {
            reason: 'looker_group_id_required'
          });
        }
        let group = mapGroup(await client.getGroup(ctx.input.groupId));
        return {
          output: { group },
          message: `Retrieved group **${groupLabel(group)}**`
        };
      }
      case 'search': {
        let usesLegacyPagination =
          ctx.input.page !== undefined || ctx.input.perPage !== undefined;
        let usesCurrentPagination =
          ctx.input.limit !== undefined || ctx.input.offset !== undefined;
        if (usesLegacyPagination && usesCurrentPagination) {
          throw createApiServiceError(
            'Use either limit and offset or the deprecated page and perPage fields, not both.',
            { reason: 'looker_group_pagination_conflict' }
          );
        }
        if (ctx.input.page !== undefined && ctx.input.perPage === undefined) {
          throw createApiServiceError('perPage is required when page is provided.', {
            reason: 'looker_group_per_page_required'
          });
        }

        let limit = ctx.input.limit;
        let offset = ctx.input.offset;
        if (usesLegacyPagination) {
          limit = ctx.input.perPage;
          if (ctx.input.page !== undefined && ctx.input.perPage !== undefined) {
            offset = (ctx.input.page - 1) * ctx.input.perPage;
          }
        }

        let results = await client.searchGroups({
          id: ctx.input.groupId,
          name: ctx.input.name,
          external_group_id: ctx.input.externalGroupId,
          externally_managed: ctx.input.externallyManaged,
          externally_orphaned: ctx.input.externallyOrphaned,
          filter_or: ctx.input.filterOr,
          sorts: ctx.input.sorts,
          limit,
          offset
        });
        if (!Array.isArray(results)) {
          throw createApiServiceError('Looker returned an invalid group search response.', {
            reason: 'looker_group_search_response_invalid'
          });
        }
        let groups = results.map(mapGroup);
        return {
          output: { groups, count: groups.length },
          message: `Found **${groups.length}** group(s)${ctx.input.name !== undefined ? ` matching "${ctx.input.name}"` : ''}.`
        };
      }
      case 'create': {
        if (!ctx.input.name) {
          throw createApiServiceError('name is required for create action.', {
            reason: 'looker_group_name_required'
          });
        }
        let createBody: LookerWriteGroup = { name: ctx.input.name };
        if (ctx.input.canAddToContentMetadata !== undefined) {
          createBody.can_add_to_content_metadata = ctx.input.canAddToContentMetadata;
        }
        let group = mapGroup(await client.createGroup(createBody));
        return {
          output: { group },
          message: `Created group **${groupLabel(group)}** (ID: ${group.groupId})`
        };
      }
      case 'update': {
        if (!ctx.input.groupId) {
          throw createApiServiceError('groupId is required for update action.', {
            reason: 'looker_group_id_required'
          });
        }
        let updateBody: LookerWriteGroup = {};
        if (ctx.input.name !== undefined) updateBody.name = ctx.input.name;
        if (ctx.input.canAddToContentMetadata !== undefined) {
          updateBody.can_add_to_content_metadata = ctx.input.canAddToContentMetadata;
        }
        if (Object.keys(updateBody).length === 0) {
          throw createApiServiceError(
            'At least one of name or canAddToContentMetadata is required for update action.',
            { reason: 'looker_group_update_fields_required' }
          );
        }
        let group = mapGroup(await client.updateGroup(ctx.input.groupId, updateBody));
        return {
          output: { group },
          message: `Updated group **${groupLabel(group)}**`
        };
      }
      case 'delete': {
        if (!ctx.input.groupId) {
          throw createApiServiceError('groupId is required for delete action.', {
            reason: 'looker_group_id_required'
          });
        }
        let group = mapGroup(await client.getGroup(ctx.input.groupId));
        await client.deleteGroup(ctx.input.groupId);
        return {
          output: { group: { ...group, deleted: true } },
          message: `Permanently deleted group **${groupLabel(group)}** (ID: ${group.groupId})`
        };
      }
      case 'add_user': {
        if (!ctx.input.groupId) {
          throw createApiServiceError('groupId is required for add_user action.', {
            reason: 'looker_group_id_required'
          });
        }
        if (!ctx.input.userId) {
          throw createApiServiceError('userId is required for add_user action.', {
            reason: 'looker_group_user_id_required'
          });
        }
        let user = mapGroupUser(
          await client.addGroupUser(ctx.input.groupId, ctx.input.userId)
        );
        let group = mapGroup(await client.getGroup(ctx.input.groupId));
        return {
          output: { group, user, userId: user.userId },
          message: `Added user ${user.userId} to group **${groupLabel(group)}**`
        };
      }
      case 'remove_user': {
        if (!ctx.input.groupId) {
          throw createApiServiceError('groupId is required for remove_user action.', {
            reason: 'looker_group_id_required'
          });
        }
        if (!ctx.input.userId) {
          throw createApiServiceError('userId is required for remove_user action.', {
            reason: 'looker_group_user_id_required'
          });
        }
        await client.removeGroupUser(ctx.input.groupId, ctx.input.userId);
        let group = mapGroup(await client.getGroup(ctx.input.groupId));
        return {
          output: { group, userId: ctx.input.userId },
          message: `Removed user ${ctx.input.userId} from group **${groupLabel(group)}**`
        };
      }
    }
  })
  .build();
