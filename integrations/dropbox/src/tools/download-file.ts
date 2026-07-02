import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description: `Download a file from Dropbox. Returns the file as an attachment along with its metadata. Suitable for text-based files.`,
  constraints: [
    'Only text-based file content is returned. Binary files will return raw data that may not be usable as text.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      path: z
        .string()
        .describe(
          'Path or ID of the file to download (e.g., "/Documents/report.txt" or "id:abc123")'
        )
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('File name'),
      pathDisplay: z.string().optional().describe('Display path'),
      fileId: z.string().optional().describe('Unique file ID'),
      size: z.number().optional().describe('File size in bytes'),
      rev: z.string().optional().describe('File revision')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);
    let result = await client.downloadFile(ctx.input.path);

    return {
      output: {
        name: result.metadata.name,
        pathDisplay: result.metadata.path_display,
        fileId: result.metadata.id,
        size: result.metadata.size,
        rev: result.metadata.rev
      },
      attachments: [createTextAttachment(result.content)],
      message: `Downloaded **${result.metadata.name || ctx.input.path}** (${result.metadata.size ?? '?'} bytes).`
    };
  })
  .build();
