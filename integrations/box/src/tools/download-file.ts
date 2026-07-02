import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description: `Download a Box file and return the file content as a Slate attachment, with structured output limited to file metadata.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('The unique ID of the Box file to download'),
      version: z.string().optional().describe('Optional file version ID to download')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('The downloaded file ID'),
      name: z.string().describe('Name of the downloaded file'),
      size: z.number().optional().describe('Box-reported file size in bytes'),
      byteLength: z.number().describe('Decoded byte length of the returned attachment'),
      mimeType: z.string().describe('MIME type of the returned attachment'),
      attachmentCount: z.number().describe('Number of attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.downloadFile(ctx.input.fileId, ctx.input.version);
    let file = result.file;

    return {
      output: {
        fileId: file.id,
        name: file.name,
        size: file.size,
        byteLength: result.byteLength,
        mimeType: result.mimeType,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(result.contentBase64, result.mimeType)],
      message: `Downloaded file **${file.name}** (${file.id}) as an attachment.`
    };
  });
