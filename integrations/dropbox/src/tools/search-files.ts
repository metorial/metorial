import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

export let searchFiles = SlateTool.create(spec, {
  name: 'Search Files',
  key: 'search_files',
  description: `Search for files and folders in Dropbox by name or content. Returns matching entries with relevance info. Optionally filter by path or file category.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      path: z.string().optional().describe('Scope search to a specific folder path'),
      maxResults: z.number().optional().describe('Maximum number of results to return'),
      fileCategories: z
        .array(
          z.enum([
            'image',
            'document',
            'pdf',
            'spreadsheet',
            'presentation',
            'audio',
            'video',
            'folder',
            'paper',
            'others'
          ])
        )
        .optional()
        .describe('Filter results by file category')
    })
  )
  .output(
    z.object({
      matches: z
        .array(
          z.object({
            tag: z.string().describe('Match type'),
            name: z.string().describe('File or folder name'),
            pathDisplay: z.string().optional().describe('Display path'),
            entryId: z.string().optional().describe('Unique entry ID'),
            entryType: z.string().optional().describe('Entry type: file, folder, or deleted'),
            serverModified: z.string().optional().describe('Last server modification time'),
            size: z.number().optional().describe('File size in bytes')
          })
        )
        .describe('Search result matches'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);
    let result = await client.searchFiles(
      ctx.input.query,
      ctx.input.path,
      ctx.input.maxResults,
      ctx.input.fileCategories
    );

    let matches = (result.matches || []).map((match: any) => {
      let metadata = match.metadata?.metadata || match.metadata;
      return {
        tag: match.match_type?.['.tag'] || 'filename',
        name: metadata.name,
        pathDisplay: metadata.path_display,
        entryId: metadata.id,
        entryType: metadata['.tag'],
        serverModified: metadata.server_modified,
        size: metadata.size
      };
    });

    return {
      output: {
        matches,
        hasMore: result.has_more ?? false
      },
      message: `Found **${matches.length}** results for "${ctx.input.query}"${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
