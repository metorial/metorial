import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { databricksServiceError } from '../lib/errors';
import { spec } from '../spec';

let isLikelyBase64 = (value: string) => {
  let normalized = value.replace(/\s+/g, '');
  return (
    normalized.length > 0 &&
    normalized.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(normalized)
  );
};

export let manageFiles = SlateTool.create(spec, {
  name: 'Manage Files',
  key: 'manage_files',
  description: `Manage files and directories with the current Databricks Files API for workspace files and Unity Catalog Volumes. Supports listing directories, creating and deleting directories, uploading files, downloading files as Slate attachments, and deleting files.`,
  instructions: [
    'Use absolute paths such as /Volumes/catalog/schema/volume/path/file.txt or workspace file paths supported by the Files API.',
    'Downloaded bytes are returned in response attachments, not inline output fields.',
    'Uploads expect base64-encoded file content.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_directory',
          'create_directory',
          'delete_directory',
          'download_file',
          'upload_file',
          'delete_file'
        ])
        .describe('Files API operation to perform'),
      path: z
        .string()
        .describe(
          'Absolute file or directory path, for example /Volumes/catalog/schema/volume/file.txt'
        ),
      contentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded file bytes, required for upload_file'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type to use for download attachments when Databricks omits one'),
      overwrite: z
        .boolean()
        .optional()
        .describe('Whether upload_file should overwrite an existing file'),
      pageSize: z.number().optional().describe('Maximum directory entries to return'),
      pageToken: z.string().optional().describe('Pagination token for list_directory'),
      range: z
        .string()
        .optional()
        .describe('HTTP byte range for download_file, for example bytes=0-499')
    })
  )
  .output(
    z.object({
      path: z.string().describe('Path acted on by the operation'),
      entries: z
        .array(
          z.object({
            path: z.string().describe('Absolute file or directory path'),
            name: z.string().optional().describe('Last path component'),
            isDirectory: z.boolean().optional().describe('Whether the item is a directory'),
            fileSize: z.number().optional().describe('File size in bytes'),
            lastModified: z.string().optional().describe('Last modification time in epoch ms')
          })
        )
        .optional()
        .describe('Directory entries returned by list_directory'),
      nextPageToken: z.string().optional().describe('Token for the next directory page'),
      byteLength: z.number().optional().describe('Downloaded file byte length'),
      mimeType: z.string().optional().describe('MIME type of the returned attachment'),
      lastModified: z.string().optional().describe('Downloaded file Last-Modified header'),
      attachmentCount: z.number().optional().describe('Number of returned Slate attachments'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list_directory': {
        let result = await client.listFilesDirectory(ctx.input.path, {
          pageSize: ctx.input.pageSize,
          pageToken: ctx.input.pageToken
        });
        let entries = (result.contents ?? []).map((entry: any) => ({
          path: entry.path ?? '',
          name: entry.name,
          isDirectory: entry.is_directory,
          fileSize: entry.file_size,
          lastModified: entry.last_modified ? String(entry.last_modified) : undefined
        }));

        return {
          output: {
            path: ctx.input.path,
            entries,
            nextPageToken: result.next_page_token,
            success: true
          },
          message: `Found **${entries.length}** item(s) in \`${ctx.input.path}\`.`
        };
      }
      case 'create_directory': {
        await client.createFilesDirectory(ctx.input.path);
        return {
          output: { path: ctx.input.path, success: true },
          message: `Created directory \`${ctx.input.path}\`.`
        };
      }
      case 'delete_directory': {
        await client.deleteFilesDirectory(ctx.input.path);
        return {
          output: { path: ctx.input.path, success: true },
          message: `Deleted directory \`${ctx.input.path}\`.`
        };
      }
      case 'download_file': {
        let result = await client.downloadFile(ctx.input.path, ctx.input.range);
        let mimeType = result.contentType || ctx.input.mimeType || 'application/octet-stream';
        return {
          output: {
            path: ctx.input.path,
            byteLength: result.contentLength,
            mimeType,
            lastModified: result.lastModified,
            attachmentCount: 1,
            success: true
          },
          attachments: [createBase64Attachment(result.contentBase64, mimeType)],
          message: `Downloaded file \`${ctx.input.path}\`.`
        };
      }
      case 'upload_file': {
        if (!ctx.input.contentBase64 || !isLikelyBase64(ctx.input.contentBase64)) {
          throw databricksServiceError(
            'contentBase64 is required and must be valid base64 for upload_file'
          );
        }
        await client.uploadFile(ctx.input.path, ctx.input.contentBase64, ctx.input.overwrite);
        return {
          output: { path: ctx.input.path, success: true },
          message: `Uploaded file to \`${ctx.input.path}\`.`
        };
      }
      case 'delete_file': {
        await client.deleteFile(ctx.input.path);
        return {
          output: { path: ctx.input.path, success: true },
          message: `Deleted file \`${ctx.input.path}\`.`
        };
      }
    }
  })
  .build();
