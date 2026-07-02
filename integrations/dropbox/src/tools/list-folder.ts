import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

let entrySchema = z.object({
  tag: z.string().describe('Entry type: file, folder, or deleted'),
  name: z.string().describe('Name of the file or folder'),
  pathLower: z.string().optional().describe('Lowercased full path'),
  pathDisplay: z.string().optional().describe('Display path with original casing'),
  entryId: z.string().optional().describe('Unique ID for the entry'),
  clientModified: z
    .string()
    .optional()
    .describe('Last modification time set by the client (files only)'),
  serverModified: z
    .string()
    .optional()
    .describe('Last modification time on the server (files only)'),
  rev: z.string().optional().describe('Revision hash (files only)'),
  size: z.number().optional().describe('File size in bytes (files only)'),
  isDownloadable: z.boolean().optional().describe('Whether the file can be downloaded')
});

export let listFolder = SlateTool.create(spec, {
  name: 'List Folder',
  key: 'list_folder',
  description: `List files and folders in a Dropbox directory. Supports recursive listing and pagination via cursor. Use path "/" or "" for the root directory.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      path: z.string().describe('Path to the folder to list. Use "/" or "" for root.'),
      recursive: z
        .boolean()
        .optional()
        .describe('Whether to list contents recursively including subfolders'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor from a previous list call for pagination'),
      limit: z.number().optional().describe('Maximum number of entries to return per page')
    })
  )
  .output(
    z.object({
      entries: z.array(entrySchema).describe('List of file and folder entries'),
      cursor: z.string().describe('Cursor for fetching the next page of results'),
      hasMore: z.boolean().describe('Whether there are more entries to fetch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);

    let result: any;
    if (ctx.input.cursor) {
      result = await client.listFolderContinue(ctx.input.cursor);
    } else {
      result = await client.listFolder(
        ctx.input.path,
        ctx.input.recursive ?? false,
        ctx.input.limit
      );
    }

    let entries = (result.entries || []).map((entry: any) => ({
      tag: entry['.tag'],
      name: entry.name,
      pathLower: entry.path_lower,
      pathDisplay: entry.path_display,
      entryId: entry.id,
      clientModified: entry.client_modified,
      serverModified: entry.server_modified,
      rev: entry.rev,
      size: entry.size,
      isDownloadable: entry.is_downloadable
    }));

    return {
      output: {
        entries,
        cursor: result.cursor,
        hasMore: result.has_more
      },
      message: `Listed **${entries.length}** entries in **${ctx.input.path || '/'}**${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
