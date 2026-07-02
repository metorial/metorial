import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

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
  name: 'Manage Bookmarks',
  key: 'manage_bookmarks',
  description: `Create, list, or delete bookmarks (saved web links) in Zoho Mail. Supports both personal and group bookmarks. Bookmarks can be organized into collections.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      scope: z
        .enum(['personal', 'group'])
        .default('personal')
        .describe('Whether this is a personal or group bookmark'),
      groupId: z.string().optional().describe('Group ID (required when scope is "group")'),
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
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.dataCenterDomain
    });

    let { action, scope, groupId } = ctx.input;

    if (scope === 'group' && !groupId) {
      throw new Error('groupId is required for group bookmark operations');
    }

    let mapBookmark = (b: any) => ({
      bookmarkId: String(b.bookmarkId || b.linkId || b.id),
      bookmarkName: b.name || b.bookmarkName || b.linkName,
      bookmarkUrl: b.url || b.bookmarkUrl || b.linkUrl,
      bookmarkDescription: b.description || b.bookmarkDescription,
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
      if (!ctx.input.bookmarkUrl) throw new Error('bookmarkUrl is required for create action');
      let data: any = {
        url: ctx.input.bookmarkUrl,
        name: ctx.input.bookmarkName,
        description: ctx.input.bookmarkDescription,
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
      if (!ctx.input.bookmarkId) throw new Error('bookmarkId is required for delete action');
      await client.deletePersonalBookmark(ctx.input.bookmarkId);
      return {
        output: { success: true },
        message: `Deleted bookmark ${ctx.input.bookmarkId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
