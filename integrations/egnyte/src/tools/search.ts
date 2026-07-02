import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let searchTool = SlateTool.create(spec, {
  name: 'Search Content',
  key: 'search',
  description: `Search for files and folders in Egnyte by filename, content, or metadata. Results are scoped to items the authenticated user has access to. Supports date filtering and folder scoping.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string (searches filenames and content)'),
      folder: z.string().optional().describe('Limit results to items within this folder path'),
      modifiedBefore: z
        .string()
        .optional()
        .describe(
          'Only include items modified before this date (ISO 8601, e.g. "2024-01-15T00:00:00")'
        ),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only include items modified after this date (ISO 8601)'),
      offset: z.number().optional().describe('Zero-based offset for pagination'),
      count: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            name: z.string().describe('File or folder name'),
            path: z.string().describe('Full path'),
            isFolder: z.boolean().optional(),
            size: z.number().optional().describe('File size in bytes'),
            entryId: z.string().optional(),
            groupId: z.string().optional(),
            lastModified: z.string().optional(),
            uploadedBy: z.string().optional(),
            snippet: z.string().optional().describe('Text snippet showing matching content')
          })
        )
        .describe('Search results'),
      totalCount: z.number().optional().describe('Total number of matching items'),
      offset: z.number().optional(),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.search({
      query: ctx.input.query,
      folder: ctx.input.folder,
      modifiedBefore: ctx.input.modifiedBefore,
      modifiedAfter: ctx.input.modifiedAfter,
      offset: ctx.input.offset,
      count: ctx.input.count
    })) as Record<string, unknown>;

    let rawResults = Array.isArray(result.results) ? result.results : [];
    let results = rawResults.map((r: Record<string, unknown>) => ({
      name: String(r.name || ''),
      path: String(r.path || ''),
      isFolder: typeof r.is_folder === 'boolean' ? r.is_folder : undefined,
      size: typeof r.size === 'number' ? r.size : undefined,
      entryId: r.entry_id ? String(r.entry_id) : undefined,
      groupId: r.group_id ? String(r.group_id) : undefined,
      lastModified: r.last_modified ? String(r.last_modified) : undefined,
      uploadedBy: r.uploaded_by ? String(r.uploaded_by) : undefined,
      snippet: r.snippet ? String(r.snippet) : undefined
    }));

    let totalCount = typeof result.total_count === 'number' ? result.total_count : undefined;
    let hasMore =
      totalCount !== undefined && ctx.input.offset !== undefined
        ? ctx.input.offset + results.length < totalCount
        : undefined;

    return {
      output: {
        results,
        totalCount,
        offset: typeof result.offset === 'number' ? result.offset : undefined,
        hasMore
      },
      message: `Found **${results.length}** result(s) for "${ctx.input.query}"${totalCount !== undefined ? ` (${totalCount} total)` : ''}`
    };
  })
  .build();
