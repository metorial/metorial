import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { nativePath, optionalText, text } from '../lib/contracts';
import { spec } from '../spec';

export let getFileInfo = SlateTool.create(spec, {
  name: 'Get File Info',
  key: 'get_file_info',
  description: `Retrieve detailed metadata for a specific file or folder, including size, checksums, timestamps, permissions and preview status without logging a download. Use download_file for file content.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      path: z.string().describe('Full path to the file or folder')
    })
  )
  .output(
    z.object({
      path: z.string().describe('Full path'),
      displayName: z.string().describe('Display name'),
      type: z.string().describe('"file" or "directory"'),
      size: z.number().optional().describe('Size in bytes'),
      mimeType: z.string().optional().describe('MIME type'),
      mtime: z.string().optional().describe('Last modified timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      permissions: z.string().optional().describe('Permission flags'),
      crc32: z.string().optional().describe('CRC32 checksum'),
      md5: z.string().optional().describe('MD5 checksum'),
      sha1: z.string().optional().describe('SHA1 checksum'),
      sha256: z.string().optional().describe('SHA256 checksum'),
      region: z.string().optional().describe('Storage region'),
      downloadUri: z.string().optional().describe('Temporary download URL'),
      previewStatus: z.string().optional().describe('Preview generation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let file = await client.getFileInfo(ctx.input.path);
    let preview = file.preview as Record<string, unknown> | undefined;

    let output = {
      path: nativePath(file.path),
      displayName: nativePath(file.display_name),
      type: text(file.type),
      size: typeof file.size === 'number' ? file.size : undefined,
      mimeType: optionalText(file.mime_type),
      mtime: optionalText(file.mtime),
      createdAt: optionalText(file.created_at),
      permissions: optionalText(file.permissions),
      crc32: optionalText(file.crc32),
      md5: optionalText(file.md5),
      sha1: optionalText(file.sha1),
      sha256: optionalText(file.sha256),
      region: optionalText(file.region),
      downloadUri: undefined,
      previewStatus: optionalText(preview?.status)
    };

    return {
      output,
      message: `Retrieved info for **${output.displayName}** (${output.type}, ${output.size !== undefined ? formatBytes(output.size) : 'unknown size'})`
    };
  })
  .build();

let formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  let units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
};
