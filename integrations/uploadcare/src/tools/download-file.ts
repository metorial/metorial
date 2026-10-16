import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description:
    'Prepare the original file for download using its public Uploadcare CDN URL. The file must be ready and available through public delivery.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      fileId: z
        .string()
        .describe('UUID of the file; discover files with list_files or search_files')
    })
  )
  .output(
    z.object({
      fileId: z.string(),
      originalFilename: z.string(),
      mimeType: z.string(),
      size: z.number(),
      originalFileUrl: z.string().describe('Public CDN URL returned by Uploadcare')
    })
  )
  .handleInvocation(async ctx => {
    let file = await new Client(ctx.auth).getFile(ctx.input.fileId);
    if (!file.is_ready || !file.original_file_url || file.datetime_removed) {
      throw createApiServiceError(
        'This file is not ready or has no public download URL. Check get_file for its current availability.'
      );
    }
    await ctx.addAttachment({
      type: 'url',
      url: file.original_file_url,
      filename: file.original_filename,
      mimeType: file.mime_type
    });
    return {
      output: {
        fileId: file.uuid,
        originalFilename: file.original_filename,
        mimeType: file.mime_type,
        size: file.size,
        originalFileUrl: file.original_file_url
      },
      message: `Prepared **${file.original_filename}** for download.`
    };
  })
  .build();
