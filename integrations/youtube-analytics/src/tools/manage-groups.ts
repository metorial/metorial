import { SlateTool } from 'slates';
import { z } from 'zod';
import { YouTubeAnalyticsClient } from '../lib/client';
import { youtubeAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageGroups = SlateTool.create(spec, {
  name: 'Manage Analytics Groups',
  key: 'manage_groups',
  description: `Create, update, delete, or list YouTube Analytics groups.
Groups are custom collections of up to 500 channels, videos, playlists, or assets used for aggregated analytics reporting.
Use the **list** action to view existing groups, **create** to make a new group, **update** to rename a group, or **delete** to remove a group.`,
  instructions: [
    'For "create", both title and itemType are required.',
    'For "update", both groupId and title are required.',
    'For "delete", groupId is required.',
    'For "list", no additional parameters are required (lists all groups for the authenticated user).'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(youtubeAnalyticsActionScopes.manageGroups)
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('Action to perform on groups.'),
      groupId: z
        .string()
        .optional()
        .describe(
          'Group ID (required for update and delete, optional for list to fetch a specific group).'
        ),
      title: z.string().optional().describe('Group title (required for create and update).'),
      itemType: z
        .enum(['youtube#video', 'youtube#playlist', 'youtube#channel', 'youtubePartner#asset'])
        .optional()
        .describe('Type of items in the group (required for create).'),
      onBehalfOfContentOwner: z
        .string()
        .optional()
        .describe('Content owner ID for content owner operations.'),
      pageToken: z.string().optional().describe('Pagination token for list operations.')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID.'),
            title: z.string().describe('Group title.'),
            publishedAt: z.string().describe('When the group was created.'),
            itemCount: z.number().describe('Number of items in the group.'),
            itemType: z.string().describe('Type of items in the group.')
          })
        )
        .optional()
        .describe('List of groups (for list action).'),
      group: z
        .object({
          groupId: z.string().describe('Group ID.'),
          title: z.string().describe('Group title.'),
          publishedAt: z.string().describe('When the group was created.'),
          itemCount: z.number().describe('Number of items in the group.'),
          itemType: z.string().describe('Type of items in the group.')
        })
        .optional()
        .describe('Created or updated group (for create/update actions).'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the group was deleted (for delete action).'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for fetching the next page of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new YouTubeAnalyticsClient({ token: ctx.auth.token });
    let { action, groupId, title, itemType, onBehalfOfContentOwner, pageToken } = ctx.input;

    if (action === 'list') {
      let result = await client.listGroups({
        groupId,
        onBehalfOfContentOwner,
        pageToken
      });

      let groups = result.groups.map(g => ({
        groupId: g.groupId,
        title: g.title,
        publishedAt: g.publishedAt,
        itemCount: g.itemCount,
        itemType: g.itemType
      }));

      return {
        output: { groups, nextPageToken: result.nextPageToken },
        message: `Found **${groups.length}** analytics group(s).`
      };
    }

    if (action === 'create') {
      if (!title) throw new Error('Title is required for creating a group.');
      if (!itemType) throw new Error('Item type is required for creating a group.');

      let group = await client.createGroup(title, itemType, onBehalfOfContentOwner);

      return {
        output: {
          group: {
            groupId: group.groupId,
            title: group.title,
            publishedAt: group.publishedAt,
            itemCount: group.itemCount,
            itemType: group.itemType
          }
        },
        message: `Created group **"${group.title}"** (${group.groupId}) for ${group.itemType} items.`
      };
    }

    if (action === 'update') {
      if (!groupId) throw new Error('Group ID is required for updating a group.');
      if (!title) throw new Error('Title is required for updating a group.');

      let group = await client.updateGroup(groupId, title, onBehalfOfContentOwner);

      return {
        output: {
          group: {
            groupId: group.groupId,
            title: group.title,
            publishedAt: group.publishedAt,
            itemCount: group.itemCount,
            itemType: group.itemType
          }
        },
        message: `Updated group **"${group.title}"** (${group.groupId}).`
      };
    }

    if (action === 'delete') {
      if (!groupId) throw new Error('Group ID is required for deleting a group.');

      await client.deleteGroup(groupId, onBehalfOfContentOwner);

      return {
        output: { deleted: true },
        message: `Deleted group **${groupId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
