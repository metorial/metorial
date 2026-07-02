import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description: `Download a file from Dropbox. Returns the file content as a Slate attachment along with its metadata.`,
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
        ),
      mimeType: z
        .string()
        .optional()
        .describe('Optional MIME type to use for the returned attachment')
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('File name'),
      pathDisplay: z.string().optional().describe('Display path'),
      fileId: z.string().optional().describe('Unique file ID'),
      size: z.number().optional().describe('File size in bytes'),
      rev: z.string().optional().describe('File revision'),
      mimeType: z.string().optional().describe('Detected or requested attachment MIME type')
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
        rev: result.metadata.rev,
        mimeType: ctx.input.mimeType ?? result.contentType
      },
      attachments: [
        createBase64Attachment(
          result.contentBase64,
          ctx.input.mimeType ?? result.contentType ?? 'application/octet-stream'
        )
      ],
      message: `Downloaded **${result.metadata.name || ctx.input.path}** (${result.metadata.size ?? '?'} bytes).`
    };
  })
  .build();
