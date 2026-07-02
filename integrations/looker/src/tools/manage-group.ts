import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

let groupOutputSchema = z.object({
  groupId: z.string().describe('Group ID'),
  name: z.string().optional().describe('Group name'),
  userCount: z.number().optional().describe('Number of users in the group'),
  containsCurrentUser: z
    .boolean()
    .optional()
    .describe('Whether the current user is in the group'),
  externallyManaged: z.boolean().optional().describe('Whether the group is externally managed')
});

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Get, create, update, delete, or search for user groups. Groups can be used for assigning roles and managing content access. Can also add or remove users from groups.`,
  instructions: [
    'To search groups: set action to "search" with optional name filter.',
    'To get: set action to "get" with groupId.',
    'To create: set action to "create" with name.',
    'To update: set action to "update" with groupId and name.',
    'To delete: set action to "delete" with groupId.',
    'To add a user: set action to "add_user" with groupId and userId.',
    'To remove a user: set action to "remove_user" with groupId and userId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'search', 'create', 'update', 'delete', 'add_user', 'remove_user'])
        .describe('Action to perform'),
      groupId: z.string().optional().describe('Group ID'),
      name: z.string().optional().describe('Group name'),
      userId: z.string().optional().describe('User ID (for add_user/remove_user)'),
      page: z.number().optional().describe('Page number (for search)'),
      perPage: z.number().optional().describe('Results per page (for search)')
    })
  )
  .output(
    z.object({
      group: groupOutputSchema.optional().describe('Group details'),
      groups: z.array(groupOutputSchema).optional().describe('List of groups (for search)'),
      count: z.number().optional().describe('Number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let mapGroup = (g: any) => ({
      groupId: String(g.id),
      name: g.name,
      userCount: g.user_count,
      containsCurrentUser: g.contains_current_user,
      externallyManaged: g.externally_managed
    });

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.groupId) throw new Error('groupId is required');
        let group = await client.getGroup(ctx.input.groupId);
        return {
          output: { group: mapGroup(group) },
          message: `Retrieved group **${group.name}**`
        };
      }
      case 'search': {
        let results = await client.searchGroups({
          name: ctx.input.name,
          page: ctx.input.page,
          per_page: ctx.input.perPage
        });
        let groups = (results || []).map(mapGroup);
        return {
          output: { groups, count: groups.length },
          message: `Found **${groups.length}** group(s)${ctx.input.name ? ` matching "${ctx.input.name}"` : ''}.`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required');
        let group = await client.createGroup({ name: ctx.input.name });
        return {
          output: { group: mapGroup(group) },
          message: `Created group **${group.name}** (ID: ${group.id})`
        };
      }
      case 'update': {
        if (!ctx.input.groupId) throw new Error('groupId is required');
        let updateBody: Record<string, any> = {};
        if (ctx.input.name !== undefined) updateBody.name = ctx.input.name;
        let group = await client.updateGroup(ctx.input.groupId, updateBody);
        return {
          output: { group: mapGroup(group) },
          message: `Updated group **${group.name}**`
        };
      }
      case 'delete': {
        if (!ctx.input.groupId) throw new Error('groupId is required');
        let group = await client.getGroup(ctx.input.groupId);
        await client.deleteGroup(ctx.input.groupId);
        return {
          output: { group: mapGroup(group) },
          message: `Deleted group **${group.name}** (ID: ${ctx.input.groupId})`
        };
      }
      case 'add_user': {
        if (!ctx.input.groupId) throw new Error('groupId is required');
        if (!ctx.input.userId) throw new Error('userId is required');
        await client.addGroupUser(ctx.input.groupId, ctx.input.userId);
        let group = await client.getGroup(ctx.input.groupId);
        return {
          output: { group: mapGroup(group) },
          message: `Added user ${ctx.input.userId} to group **${group.name}**`
        };
      }
      case 'remove_user': {
        if (!ctx.input.groupId) throw new Error('groupId is required');
        if (!ctx.input.userId) throw new Error('userId is required');
        await client.removeGroupUser(ctx.input.groupId, ctx.input.userId);
        let group = await client.getGroup(ctx.input.groupId);
        return {
          output: { group: mapGroup(group) },
          message: `Removed user ${ctx.input.userId} from group **${group.name}**`
        };
      }
    }
  })
  .build();
