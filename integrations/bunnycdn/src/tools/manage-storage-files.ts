import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { StorageClient } from '../lib/client';
import { spec } from '../spec';

let fileSchema = z
  .object({
    guid: z.string().optional().describe('Unique file identifier'),
    storageZoneName: z.string().optional().describe('Storage zone name'),
    path: z.string().optional().describe('Full path of the file'),
    objectName: z.string().optional().describe('File or directory name'),
    length: z.number().optional().describe('File size in bytes'),
    lastChanged: z.string().optional().describe('Last modification date'),
    serverId: z.number().optional().describe('Server ID'),
    arrayNumber: z.number().optional().describe('Storage array number'),
    isDirectory: z.boolean().optional().describe('Whether this is a directory'),
    userId: z.string().optional().describe('User ID'),
    contentType: z.string().optional().describe('MIME content type'),
    dateCreated: z.string().optional().describe('Creation date'),
    storageZoneId: z.number().optional().describe('Storage zone ID'),
    checksum: z.string().optional().describe('File checksum')
  })
  .passthrough();

export let manageStorageFiles = SlateTool.create(spec, {
  name: 'Manage Storage Files',
  key: 'manage_storage_files',
  description: `Upload, download, list, or delete files in Edge Storage zones. Requires the Storage Zone Password to be configured in authentication. Operates on files within a specific storage zone by name and path.`,
  instructions: [
    'The storageZoneName must match an existing storage zone name.',
    'File paths should not include the storage zone name; they are relative to the zone root.',
    'Directories are auto-created when uploading files.',
    'For upload, provide text content, or set contentEncoding to base64 for binary content.'
  ],
  constraints: [
    'Requires the Storage Zone Password to be configured.',
    "The storage region configured in settings must match the zone's primary region."
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'upload', 'download', 'delete'])
        .describe('The file operation to perform'),
      storageZoneName: z.string().describe('Name of the storage zone'),
      path: z
        .string()
        .optional()
        .describe(
          'File or directory path relative to the zone root. For list, this is the directory path. For upload/download/delete, this is the full file path.'
        ),
      content: z.string().optional().describe('File content to upload (upload action only)'),
      contentEncoding: z
        .enum(['text', 'base64'])
        .optional()
        .describe('Encoding of upload content. Defaults to text; use base64 for binary files.')
    })
  )
  .output(
    z.object({
      files: z
        .array(fileSchema)
        .optional()
        .describe('List of files/directories (list action)'),
      fileContent: z.string().optional().describe('Downloaded file text, when available'),
      downloaded: z.boolean().optional().describe('Whether a downloadable file was prepared'),
      filename: z.string().optional().describe('Downloaded filename'),
      uploaded: z.boolean().optional().describe('Whether the file was uploaded successfully'),
      deleted: z.boolean().optional().describe('Whether the file was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.storageZoneName.trim())
      throw createApiServiceError('storageZoneName is required.');
    if (ctx.input.action !== 'list' && !ctx.input.path?.replace(/\//g, '').trim())
      throw createApiServiceError('A file or directory path is required for this action.');
    if (ctx.input.action === 'upload' && ctx.input.content === undefined)
      throw createApiServiceError('content is required to upload a file.');
    if (!ctx.auth.storageToken) {
      throw createApiServiceError(
        'Storage Zone Password is required for file operations. Please configure it in the authentication settings.'
      );
    }

    let client = new StorageClient({
      storageToken: ctx.auth.storageToken,
      region: ctx.config.storageRegion || 'default'
    });

    switch (ctx.input.action) {
      case 'list': {
        let files = await client.listFiles(ctx.input.storageZoneName, ctx.input.path || '/');
        return {
          output: { files },
          message: `Listed **${files.length}** items in **${ctx.input.storageZoneName}${ctx.input.path || '/'}**.`
        };
      }
      case 'upload': {
        if (
          ctx.input.contentEncoding === 'base64' &&
          !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
            ctx.input.content!
          )
        )
          throw createApiServiceError(
            'content must be valid padded base64 when contentEncoding is base64.'
          );
        await client.uploadFile(
          ctx.input.storageZoneName,
          ctx.input.path!,
          ctx.input.contentEncoding === 'base64'
            ? Buffer.from(ctx.input.content!, 'base64')
            : ctx.input.content!
        );
        return {
          output: { uploaded: true },
          message: `Uploaded file to **${ctx.input.storageZoneName}${ctx.input.path}**.`
        };
      }
      case 'download': {
        let content = await client.downloadFile(ctx.input.storageZoneName, ctx.input.path!);
        let filename = ctx.input.path!.split('/').filter(Boolean).at(-1)!;
        await ctx.addAttachment({
          type: 'url',
          url: client.getFileUrl(ctx.input.storageZoneName, ctx.input.path!),
          headers: { AccessKey: ctx.auth.storageToken },
          filename
        });
        return {
          output: {
            fileContent: typeof content === 'string' ? content : JSON.stringify(content),
            downloaded: true,
            filename
          },
          message: `Prepared **${filename}** for download.`
        };
      }
      case 'delete': {
        await client.deleteFile(ctx.input.storageZoneName, ctx.input.path!);
        return {
          output: { deleted: true },
          message: `Deleted **${ctx.input.storageZoneName}${ctx.input.path}**.`
        };
      }
    }
  })
  .build();
