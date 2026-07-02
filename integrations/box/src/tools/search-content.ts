import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContent = SlateTool.create(spec, {
  name: 'Search Content',
  key: 'search_content',
  description: `Full-text search across all Box content accessible to the authenticated user. Filter results by file type, date ranges, ancestor folders, content type, and owner. Returns matching files and folders with key metadata.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string for full-text search'),
      fileExtensions: z
        .array(z.string())
        .optional()
        .describe('Filter by file extensions (e.g. ["pdf", "docx"])'),
      ancestorFolderIds: z
        .array(z.string())
        .optional()
        .describe('Limit search to specific folder subtrees by folder ID'),
      contentTypes: z
        .array(z.enum(['name', 'description', 'file_content', 'comments', 'tags']))
        .optional()
        .describe('Limit where Box searches for the query'),
      type: z
        .enum(['file', 'folder', 'web_link'])
        .optional()
        .describe('Filter results by item type'),
      ownerUserIds: z.array(z.string()).optional().describe('Filter by owner user IDs'),
      createdAtRange: z
        .string()
        .optional()
        .describe(
          'ISO 8601 date range for creation, e.g. "2024-01-01T00:00:00Z,2024-12-31T23:59:59Z"'
        ),
      updatedAtRange: z
        .string()
        .optional()
        .describe('ISO 8601 date range for last modification'),
      limit: z.number().optional().describe('Maximum number of results (default 30, max 200)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching results'),
      results: z.array(
        z.object({
          itemId: z.string().describe('ID of the matching item'),
          type: z.string().describe('Item type: file, folder, or web_link'),
          name: z.string().describe('Name of the item'),
          size: z.number().optional().describe('File size in bytes'),
          modifiedAt: z.string().optional().describe('ISO 8601 last modification timestamp'),
          parentFolderId: z.string().optional().describe('Parent folder ID'),
          parentFolderName: z.string().optional().describe('Parent folder name'),
          ownedBy: z.string().optional().describe('Owner name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.search(ctx.input.query, {
      fileExtensions: ctx.input.fileExtensions,
      contentTypes: ctx.input.contentTypes,
      ancestorFolderIds: ctx.input.ancestorFolderIds,
      createdAtRange: ctx.input.createdAtRange,
      updatedAtRange: ctx.input.updatedAtRange,
      ownerUserIds: ctx.input.ownerUserIds,
      type: ctx.input.type,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let results = (data.entries || []).map((item: any) => ({
      itemId: item.id,
      type: item.type,
      name: item.name,
      size: item.size,
      modifiedAt: item.modified_at,
      parentFolderId: item.parent?.id,
      parentFolderName: item.parent?.name,
      ownedBy: item.owned_by?.name
    }));

    return {
      output: {
        totalCount: data.total_count || 0,
        results
      },
      message: `Found ${data.total_count || 0} result(s) for query "${ctx.input.query}". Returned ${results.length} item(s).`
    };
  });
