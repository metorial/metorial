import { SlateTool } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
import { spec } from '../spec';

let fileEntrySchema = z.object({
  path: z.string().describe('Full path of the file or folder'),
  displayName: z.string().describe('Display name'),
  type: z.string().describe('"file" or "directory"'),
  size: z.number().optional().describe('Size in bytes'),
  mimeType: z.string().optional().describe('MIME type of the file'),
  mtime: z.string().optional().describe('Last modified timestamp'),
  permissions: z
    .string()
    .optional()
    .describe('Permission flags (r=read, w=write, d=delete, l=list)'),
  crc32: z.string().optional().describe('CRC32 checksum'),
  md5: z.string().optional().describe('MD5 checksum'),
  region: z.string().optional().describe('Storage region')
});

export let listFolder = SlateTool.create(spec, {
  name: 'List Folder',
  key: 'list_folder',
  description: `List files and folders at a given path. Returns file metadata including name, size, type, timestamps, and checksums. Supports pagination for large directories and text search filtering.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      path: z
        .string()
        .default('')
        .describe('Folder path to list. Use empty string or "/" for root.'),
      search: z
        .string()
        .optional()
        .describe('Search text to filter results across all fields'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      perPage: z
        .number()
        .optional()
        .describe('Number of items per page (default 100, max 10000)')
    })
  )
  .output(
    z.object({
      entries: z.array(fileEntrySchema).describe('List of files and folders'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FilesComClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let result = await client.listFolder(ctx.input.path, {
      cursor: ctx.input.cursor,
      perPage: ctx.input.perPage,
      search: ctx.input.search
    });

    let entries = result.entries.map((entry: Record<string, unknown>) => ({
      path: String(entry.path ?? ''),
      displayName: String(entry.display_name ?? ''),
      type: String(entry.type ?? ''),
      size: typeof entry.size === 'number' ? entry.size : undefined,
      mimeType: entry.mime_type ? String(entry.mime_type) : undefined,
      mtime: entry.mtime ? String(entry.mtime) : undefined,
      permissions: entry.permissions ? String(entry.permissions) : undefined,
      crc32: entry.crc32 ? String(entry.crc32) : undefined,
      md5: entry.md5 ? String(entry.md5) : undefined,
      region: entry.region ? String(entry.region) : undefined
    }));

    let dirs = entries.filter((e: { type: string }) => e.type === 'directory');
    let files = entries.filter((e: { type: string }) => e.type !== 'directory');

    return {
      output: {
        entries,
        nextCursor: result.cursor
      },
      message: `Listed **${entries.length}** items in \`${ctx.input.path || '/'}\` (${dirs.length} folders, ${files.length} files)${result.cursor ? '. More results available.' : '.'}`
    };
  })
  .build();
