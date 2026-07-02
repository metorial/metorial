import { SlateTool } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
import { spec } from '../spec';

export let getFileInfo = SlateTool.create(spec, {
  name: 'Get File Info',
  key: 'get_file_info',
  description: `Retrieve detailed metadata for a specific file or folder, including size, checksums, timestamps, permissions, preview status, and download URI.`,
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
    let client = new FilesComClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let file = await client.getFileInfo(ctx.input.path);
    let preview = file.preview as Record<string, unknown> | undefined;

    let output = {
      path: String(file.path ?? ''),
      displayName: String(file.display_name ?? ''),
      type: String(file.type ?? ''),
      size: typeof file.size === 'number' ? file.size : undefined,
      mimeType: file.mime_type ? String(file.mime_type) : undefined,
      mtime: file.mtime ? String(file.mtime) : undefined,
      createdAt: file.created_at ? String(file.created_at) : undefined,
      permissions: file.permissions ? String(file.permissions) : undefined,
      crc32: file.crc32 ? String(file.crc32) : undefined,
      md5: file.md5 ? String(file.md5) : undefined,
      sha1: file.sha1 ? String(file.sha1) : undefined,
      sha256: file.sha256 ? String(file.sha256) : undefined,
      region: file.region ? String(file.region) : undefined,
      downloadUri: file.download_uri ? String(file.download_uri) : undefined,
      previewStatus: preview?.status ? String(preview.status) : undefined
    };

    return {
      output,
      message: `Retrieved info for **${output.displayName}** (${output.type}, ${output.size ? formatBytes(output.size) : 'unknown size'})`
    };
  })
  .build();

let formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  let units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
};
