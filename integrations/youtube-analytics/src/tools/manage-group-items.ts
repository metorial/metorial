import { SlateTool } from 'slates';
import { z } from 'zod';
import { YouTubeAnalyticsClient } from '../lib/client';
import { youtubeAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageGroupItems = SlateTool.create(spec, {
  name: 'Manage Group Items',
  key: 'manage_group_items',
  description: `List, add, or remove items from a YouTube Analytics group.
Groups can contain up to 500 items of the same type (videos, playlists, channels, or assets).
Use **list** to see current items, **add** to add a resource, or **remove** to delete a specific item from the group.`,
  instructions: [
    'For "add", groupId, resourceId, and resourceKind are required.',
    'For "remove", groupItemId is required (this is the group-item association ID, not the resource ID).',
    'For "list", groupId is required.'
  ],
  constraints: ['Groups can contain a maximum of 500 items.'],
  tags: {
    destructive: false
  }
})
  .scopes(youtubeAnalyticsActionScopes.manageGroupItems)
  .input(
    z.object({
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform on group items.'),
      groupId: z.string().optional().describe('Group ID (required for list and add).'),
      resourceId: z
        .string()
        .optional()
        .describe(
          'Resource ID to add, e.g. a video ID, playlist ID, channel ID, or asset ID (required for add).'
        ),
      resourceKind: z
        .enum(['youtube#video', 'youtube#playlist', 'youtube#channel', 'youtubePartner#asset'])
        .optional()
        .describe('Kind of the resource being added (required for add).'),
      groupItemId: z
        .string()
        .optional()
        .describe(
          'Group item ID to remove (required for remove). This is the association ID returned when listing items, not the resource ID.'
        ),
      onBehalfOfContentOwner: z
        .string()
        .optional()
        .describe('Content owner ID for content owner operations.')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            groupItemId: z.string().describe('Group item association ID.'),
            groupId: z.string().describe('Group ID the item belongs to.'),
            resourceKind: z.string().describe('Kind of the resource.'),
            resourceId: z.string().describe('Resource ID.')
          })
        )
        .optional()
        .describe('List of group items (for list action).'),
      item: z
        .object({
          groupItemId: z.string().describe('Group item association ID.'),
          groupId: z.string().describe('Group ID.'),
          resourceKind: z.string().describe('Kind of the resource.'),
          resourceId: z.string().describe('Resource ID.')
        })
        .optional()
        .describe('Added group item (for add action).'),
      removed: z
        .boolean()
        .optional()
        .describe('Whether the item was removed (for remove action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new YouTubeAnalyticsClient({ token: ctx.auth.token });
    let { action, groupId, resourceId, resourceKind, groupItemId, onBehalfOfContentOwner } =
      ctx.input;

    if (action === 'list') {
      if (!groupId) throw new Error('Group ID is required for listing items.');

      let items = await client.listGroupItems(groupId, onBehalfOfContentOwner);

      return {
        output: {
          items: items.map(i => ({
            groupItemId: i.groupItemId,
            groupId: i.groupId,
            resourceKind: i.resourceKind,
            resourceId: i.resourceId
          }))
        },
        message: `Found **${items.length}** item(s) in group **${groupId}**.`
      };
    }

    if (action === 'add') {
      if (!groupId) throw new Error('Group ID is required for adding an item.');
      if (!resourceId) throw new Error('Resource ID is required for adding an item.');
      if (!resourceKind) throw new Error('Resource kind is required for adding an item.');

      let item = await client.addGroupItem(
        groupId,
        resourceId,
        resourceKind,
        onBehalfOfContentOwner
      );

      return {
        output: {
          item: {
            groupItemId: item.groupItemId,
            groupId: item.groupId,
            resourceKind: item.resourceKind,
            resourceId: item.resourceId
          }
        },
        message: `Added **${resourceKind}** item **${resourceId}** to group **${groupId}**.`
      };
    }

    if (action === 'remove') {
      if (!groupItemId) throw new Error('Group item ID is required for removing an item.');

      await client.removeGroupItem(groupItemId, onBehalfOfContentOwner);

      return {
        output: { removed: true },
        message: `Removed group item **${groupItemId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
