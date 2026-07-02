import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

export let getFileMetadata = SlateTool.create(spec, {
  name: 'Get File or Folder Metadata',
  key: 'get_file_metadata',
  description: `Retrieve detailed metadata for a file or folder at a given path or by ID. Returns type, size, modification dates, revision, sharing status, and media info where available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      path: z
        .string()
        .describe(
          'Path or ID of the file/folder (e.g., "/Documents/report.pdf" or "id:abc123")'
        )
    })
  )
  .output(
    z.object({
      tag: z.string().describe('Entry type: file, folder, or deleted'),
      name: z.string().describe('Name of the file or folder'),
      pathLower: z.string().optional().describe('Lowercased full path'),
      pathDisplay: z.string().optional().describe('Display path with original casing'),
      entryId: z.string().optional().describe('Unique ID for the entry'),
      clientModified: z
        .string()
        .optional()
        .describe('Last modification time set by the client'),
      serverModified: z.string().optional().describe('Last modification time on the server'),
      rev: z.string().optional().describe('Revision hash'),
      size: z.number().optional().describe('File size in bytes'),
      isDownloadable: z.boolean().optional().describe('Whether the file can be downloaded'),
      hasExplicitSharedMembers: z
        .boolean()
        .optional()
        .describe('Whether the file has explicit shared members'),
      contentHash: z.string().optional().describe('Hash of the file content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);
    let metadata = await client.getMetadata(ctx.input.path);

    return {
      output: {
        tag: metadata['.tag'],
        name: metadata.name,
        pathLower: metadata.path_lower,
        pathDisplay: metadata.path_display,
        entryId: metadata.id,
        clientModified: metadata.client_modified,
        serverModified: metadata.server_modified,
        rev: metadata.rev,
        size: metadata.size,
        isDownloadable: metadata.is_downloadable,
        hasExplicitSharedMembers: metadata.has_explicit_shared_members,
        contentHash: metadata.content_hash
      },
      message: `Retrieved metadata for **${metadata['.tag']}** "${metadata.name}" at **${metadata.path_display || ctx.input.path}**.`
    };
  })
  .build();
