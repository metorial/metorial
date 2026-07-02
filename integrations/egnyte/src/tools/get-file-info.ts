import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let getFileInfoTool = SlateTool.create(spec, {
  name: 'Get File or Folder Info',
  key: 'get_file_info',
  description: `Retrieve metadata for a file or folder in Egnyte. Can look up by path or by persistent ID (group_id for files, folder_id for folders). Returns name, path, size, versions, lock status, and custom properties.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      path: z
        .string()
        .optional()
        .describe('Path to the file or folder (e.g. "/Shared/Documents/report.pdf")'),
      fileGroupId: z
        .string()
        .optional()
        .describe('Persistent group ID of the file (alternative to path)'),
      folderId: z.string().optional().describe('Persistent folder ID (alternative to path)')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Name of the file or folder'),
      path: z.string().optional().describe('Full path'),
      isFolder: z.boolean().describe('Whether the item is a folder'),
      groupId: z.string().optional().describe('File group ID'),
      entryId: z.string().optional().describe('File entry ID (current version)'),
      folderId: z.string().optional().describe('Folder ID'),
      size: z.number().optional().describe('File size in bytes'),
      lastModified: z.string().optional().describe('Last modification timestamp'),
      uploadedBy: z.string().optional().describe('Username who uploaded the file'),
      numVersions: z.number().optional().describe('Number of file versions'),
      locked: z.boolean().optional().describe('Whether the file is locked'),
      lockHolder: z.string().optional().describe('Username holding the lock'),
      checksum: z.string().optional().describe('File checksum'),
      customProperties: z.any().optional().describe('Custom metadata properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result: Record<string, unknown>;

    if (ctx.input.fileGroupId) {
      result = (await client.getFileById(ctx.input.fileGroupId)) as Record<string, unknown>;
    } else if (ctx.input.folderId) {
      result = (await client.getFolderById(ctx.input.folderId)) as Record<string, unknown>;
    } else if (ctx.input.path) {
      result = (await client.getFileMetadata(ctx.input.path)) as Record<string, unknown>;
    } else {
      throw new Error('Provide either a path, fileGroupId, or folderId');
    }

    let isFolder = result.is_folder === true || result.folder_id !== undefined;

    return {
      output: {
        name: String(result.name || ''),
        path: result.path ? String(result.path) : undefined,
        isFolder,
        groupId: result.group_id ? String(result.group_id) : undefined,
        entryId: result.entry_id ? String(result.entry_id) : undefined,
        folderId: result.folder_id ? String(result.folder_id) : undefined,
        size: typeof result.size === 'number' ? result.size : undefined,
        lastModified: result.last_modified ? String(result.last_modified) : undefined,
        uploadedBy: result.uploaded_by ? String(result.uploaded_by) : undefined,
        numVersions: typeof result.num_versions === 'number' ? result.num_versions : undefined,
        locked: typeof result.locked === 'boolean' ? result.locked : undefined,
        lockHolder: result.lock_holder ? String(result.lock_holder) : undefined,
        checksum: result.checksum ? String(result.checksum) : undefined,
        customProperties: result.custom_properties
      },
      message: `Retrieved info for **${result.name}** at ${result.path || 'N/A'}${isFolder ? ' (folder)' : ` (${typeof result.size === 'number' ? formatBytes(result.size) : 'unknown size'})`}`
    };
  })
  .build();

let formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  let units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
};
