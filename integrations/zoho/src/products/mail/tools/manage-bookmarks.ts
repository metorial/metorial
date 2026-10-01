import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { Client } from '../lib/client';

let bookmarkSchema = z.object({
  bookmarkId: z.string().describe('Bookmark ID'),
  bookmarkName: z.string().optional().describe('Bookmark name'),
  bookmarkUrl: z.string().optional().describe('Bookmark URL'),
  bookmarkDescription: z.string().optional().describe('Bookmark description'),
  collectionId: z.string().optional().describe('Collection ID'),
  createdTime: z.string().optional().describe('Creation timestamp'),
  groupId: z.string().optional().describe('Group ID if group bookmark')
});

export let manageBookmarks = SlateTool.create(spec, {
  name: 'Mail Manage Bookmarks',
  key: 'mail_manage_bookmarks',
  description: `Create, list, or delete bookmarks (saved web links) in Zoho Mail. Supports both personal and group bookmarks. Bookmarks can be organized into collections.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['listGroups', 'list', 'create', 'delete'])
        .describe('Operation to perform'),
      scope: z
        .enum(['personal', 'group'])
        .default('personal')
        .describe('Whether this is a personal or group bookmark'),
      groupId: z
        .string()
        .optional()
        .describe(
          'Group ID. Call mail_manage_bookmarks with listGroups to discover groups. Required when scope is "group")'
        ),
      bookmarkId: z.string().optional().describe('Bookmark ID (required for delete)'),
      bookmarkName: z.string().optional().describe('Bookmark display name'),
      bookmarkUrl: z.string().optional().describe('URL to bookmark (required for create)'),
      bookmarkDescription: z.string().optional().describe('Description of the bookmark'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection ID to organize the bookmark into'),
      start: z.number().optional().describe('Starting position for list pagination'),
      limit: z.number().optional().describe('Number of bookmarks to return')
    })
  )
  .output(
    z.object({
      bookmarks: z
        .array(bookmarkSchema)
        .optional()
        .describe('List of bookmarks (for list action)'),
      bookmark: bookmarkSchema.optional().describe('Created bookmark'),
      groups: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.auth.region
    });

    let { action, scope, groupId } = ctx.input;
    if (action === 'listGroups') {
      let groups = await client.listBookmarkGroups();
      return {
        output: {
          success: true,
          groups: groups.map((group: any) => ({
            id: String(group.groupId || group.id || group.zgid),
            name: group.groupName || group.name
          }))
        },
        message: `Retrieved ${groups.length} groups.`
      };
    }

    if (scope === 'group' && !groupId) {
      throw createApiServiceError('groupId is required for group bookmark operations');
    }

    let mapBookmark = (b: any) => ({
      bookmarkId: String(b.entityId || b.bookmarkId || b.linkId || b.id),
      bookmarkName: b.title || b.name || b.bookmarkName || b.linkName,
      bookmarkUrl: b.link || b.url || b.bookmarkUrl || b.linkUrl,
      bookmarkDescription: b.summary || b.description || b.bookmarkDescription,
      collectionId: b.collectionId ? String(b.collectionId) : undefined,
      createdTime: b.createdTime ? String(b.createdTime) : undefined,
      groupId: b.groupId ? String(b.groupId) : groupId || undefined
    });

    if (action === 'list') {
      let params = { start: ctx.input.start, limit: ctx.input.limit };
      let bookmarks =
        scope === 'group' && groupId
          ? await client.listGroupBookmarks(groupId, params)
          : await client.listPersonalBookmarks(params);
      let mapped = bookmarks.map(mapBookmark);
      return {
        output: { bookmarks: mapped, success: true },
        message: `Retrieved **${mapped.length}** ${scope} bookmark(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.bookmarkUrl) {
        throw createApiServiceError('bookmarkUrl is required for create action');
      }
      let data: any = {
        link: ctx.input.bookmarkUrl,
        title: ctx.input.bookmarkName || ctx.input.bookmarkUrl,
        summary: ctx.input.bookmarkDescription,
        collectionId: ctx.input.collectionId
      };
      let result =
        scope === 'group' && groupId
          ? await client.createGroupBookmark(groupId, data)
          : await client.createPersonalBookmark(data);
      return {
        output: { bookmark: mapBookmark(result || {}), success: true },
        message: `Created ${scope} bookmark for "${ctx.input.bookmarkUrl}".`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.bookmarkId) {
        throw createApiServiceError('bookmarkId is required for delete action');
      }
      if (scope === 'group' && groupId)
        await client.deleteGroupBookmark(groupId, ctx.input.bookmarkId);
      else await client.deletePersonalBookmark(ctx.input.bookmarkId);
      return {
        output: { success: true },
        message: `Deleted bookmark ${ctx.input.bookmarkId}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
