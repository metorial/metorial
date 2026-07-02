import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve detailed information about a specific file, including content info, metadata, and optionally add-on results (appdata).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('UUID of the file to retrieve'),
      includeAppdata: z
        .boolean()
        .optional()
        .describe('Whether to include add-on results (appdata) in the response')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('UUID of the file'),
      originalFilename: z.string().describe('Original filename at upload time'),
      size: z.number().describe('File size in bytes'),
      mimeType: z.string().describe('MIME type of the file'),
      isImage: z.boolean().describe('Whether the file is an image'),
      isReady: z.boolean().describe('Whether the file has been fully processed'),
      datetimeUploaded: z.string().describe('ISO 8601 upload timestamp'),
      datetimeStored: z
        .string()
        .nullable()
        .describe('ISO 8601 store timestamp, null if not stored'),
      datetimeRemoved: z
        .string()
        .nullable()
        .describe('ISO 8601 removal timestamp, null if not removed'),
      originalFileUrl: z.string().nullable().describe('CDN URL of the original file'),
      contentInfo: z
        .any()
        .nullable()
        .describe('Content-specific info (image dimensions, video metadata, etc.)'),
      metadata: z.record(z.string(), z.string()).describe('User-defined key-value metadata'),
      appdata: z
        .any()
        .nullable()
        .describe('Add-on results data (only present if includeAppdata is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let file = await client.getFile(
      ctx.input.fileId,
      ctx.input.includeAppdata ? 'appdata' : undefined
    );

    return {
      output: {
        fileId: file.uuid,
        originalFilename: file.original_filename,
        size: file.size,
        mimeType: file.mime_type,
        isImage: file.is_image,
        isReady: file.is_ready,
        datetimeUploaded: file.datetime_uploaded,
        datetimeStored: file.datetime_stored,
        datetimeRemoved: file.datetime_removed,
        originalFileUrl: file.original_file_url,
        contentInfo: file.content_info,
        metadata: file.metadata,
        appdata: file.appdata
      },
      message: `Retrieved file **${file.original_filename}** (${file.uuid}), ${file.size} bytes, ${file.mime_type}.`
    };
  })
  .build();
