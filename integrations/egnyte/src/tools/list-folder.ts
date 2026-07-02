import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let listFolderTool = SlateTool.create(spec, {
  name: 'List Folder Contents',
  key: 'list_folder',
  description: `List the contents of a folder in Egnyte. Returns files and subfolders with their metadata including name, path, size, and modification dates. Supports pagination for large directories.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderPath: z.string().describe('Path to the folder (e.g. "/Shared/Documents")'),
      count: z.number().optional().describe('Number of items to return per page (max 1000)'),
      offset: z.number().optional().describe('Zero-based index of the first item to return'),
      sortBy: z
        .enum(['name', 'last_modified', 'size'])
        .optional()
        .describe('Field to sort results by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Folder name'),
      path: z.string().describe('Full path to the folder'),
      folderId: z.string().optional().describe('Persistent folder ID'),
      isFolder: z.boolean().describe('Always true for folders'),
      folders: z
        .array(
          z.object({
            name: z.string(),
            path: z.string(),
            folderId: z.string().optional(),
            lastModified: z.string().optional()
          })
        )
        .optional()
        .describe('List of subfolders'),
      files: z
        .array(
          z.object({
            name: z.string(),
            path: z.string(),
            groupId: z.string().optional(),
            entryId: z.string().optional(),
            size: z.number().optional(),
            lastModified: z.string().optional(),
            uploadedBy: z.string().optional(),
            numVersions: z.number().optional(),
            locked: z.boolean().optional()
          })
        )
        .optional()
        .describe('List of files'),
      totalCount: z.number().optional().describe('Total number of items in the folder'),
      offset: z.number().optional().describe('Current offset'),
      count: z.number().optional().describe('Number of items returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.listFolder(ctx.input.folderPath, {
      count: ctx.input.count,
      offset: ctx.input.offset,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    })) as Record<string, unknown>;

    let folders = Array.isArray(result.folders)
      ? result.folders.map((f: Record<string, unknown>) => ({
          name: String(f.name || ''),
          path: String(f.path || ''),
          folderId: f.folder_id ? String(f.folder_id) : undefined,
          lastModified: f.last_modified ? String(f.last_modified) : undefined
        }))
      : [];

    let files = Array.isArray(result.files)
      ? result.files.map((f: Record<string, unknown>) => ({
          name: String(f.name || ''),
          path: String(f.path || ''),
          groupId: f.group_id ? String(f.group_id) : undefined,
          entryId: f.entry_id ? String(f.entry_id) : undefined,
          size: typeof f.size === 'number' ? f.size : undefined,
          lastModified: f.last_modified ? String(f.last_modified) : undefined,
          uploadedBy: f.uploaded_by ? String(f.uploaded_by) : undefined,
          numVersions: typeof f.num_versions === 'number' ? f.num_versions : undefined,
          locked: typeof f.locked === 'boolean' ? f.locked : undefined
        }))
      : [];

    return {
      output: {
        name: String(result.name || ''),
        path: String(result.path || ''),
        folderId: result.folder_id ? String(result.folder_id) : undefined,
        isFolder: true,
        folders,
        files,
        totalCount: typeof result.total_count === 'number' ? result.total_count : undefined,
        offset: typeof result.offset === 'number' ? result.offset : undefined,
        count: typeof result.count === 'number' ? result.count : undefined
      },
      message: `Listed folder **${ctx.input.folderPath}** — ${folders.length} subfolder(s) and ${files.length} file(s) found.`
    };
  })
  .build();
