import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let browseFolders = SlateTool.create(spec, {
  name: 'Browse Folders',
  key: 'browse_folders',
  description: `Navigate the workspace folder hierarchy. List folders (optionally filtered by parent folder), get folder details, or browse a folder's contents (projects, docs, channels, etc.).`,
  instructions: [
    'To list root-level folders, set parentFolderId to null or omit folderId.',
    "To browse a folder's contents, provide a folderId.",
    'To list subfolders of a specific folder, provide parentFolderId.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z
        .string()
        .optional()
        .describe(
          "Folder ID to browse contents of. If provided, returns the folder's contents."
        ),
      parentFolderId: z
        .string()
        .nullable()
        .optional()
        .describe('Filter folders by parent folder ID. Pass null for root-level folders.'),
      titleContains: z
        .string()
        .optional()
        .describe('Filter folders whose title contains this substring'),
      sort: z
        .enum(['created_at:asc', 'created_at:desc', 'title:asc', 'title:desc'])
        .optional()
        .describe('Sort order'),
      limit: z.number().optional().describe('Max results per page (1-100, default 100)'),
      startCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      folders: z
        .array(
          z.object({
            folderId: z.string(),
            title: z.string(),
            type: z.string(),
            createdAt: z.string(),
            parentFolderId: z.string().nullable().optional(),
            childFolderIds: z.array(z.string()).nullable().optional()
          })
        )
        .optional(),
      contents: z
        .array(
          z.object({
            contentId: z.string(),
            type: z.string(),
            title: z.string(),
            createdAt: z.string(),
            authorId: z.string().nullable().optional()
          })
        )
        .optional(),
      totalCount: z.number().optional(),
      hasMore: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    // If folderId is provided, get folder contents
    if (ctx.input.folderId) {
      let result = await client.getFolderContents(ctx.input.folderId, {
        sort: ctx.input.sort,
        limit: ctx.input.limit,
        startCursor: ctx.input.startCursor
      });

      let contents = result.data.map(c => ({
        contentId: c.id,
        type: c.type,
        title: c.title,
        createdAt: c.created_at,
        authorId: c.author_id ?? null
      }));

      return {
        output: {
          contents,
          totalCount: result.page.total_count,
          hasMore: result.page.has_more,
          nextCursor: result.page.next_cursor
        },
        message: `Folder contains **${result.page.total_count}** items. Returned **${contents.length}** in this page.`
      };
    }

    // Otherwise, list folders
    let result = await client.listFolders({
      parentFolderId: ctx.input.parentFolderId,
      titleContains: ctx.input.titleContains,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      startCursor: ctx.input.startCursor
    });

    let folders = result.data.map(f => ({
      folderId: f.id,
      title: f.title,
      type: f.type,
      createdAt: f.created_at,
      parentFolderId: f.parent_folder?.id ?? null,
      childFolderIds: f.folders?.map(cf => cf.id) ?? null
    }));

    return {
      output: {
        folders,
        totalCount: result.page.total_count,
        hasMore: result.page.has_more,
        nextCursor: result.page.next_cursor
      },
      message: `Found **${result.page.total_count}** folders. Returned **${folders.length}** in this page.`
    };
  })
  .build();
