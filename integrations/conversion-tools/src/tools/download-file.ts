import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description:
    'Prepares a downloadable source or converted file by its file ID. Use the result file ID from Get Task after a successful conversion, before the file retention period expires.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      fileId: z
        .string()
        .describe('File ID returned by Upload File or a completed conversion task')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('File ID'),
      fileName: z.string().describe('Original filename'),
      fileSize: z.number().describe('File size in bytes'),
      isSizeLimited: z.boolean().describe('Whether the file exceeds the current plan limit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let info = await client.getFileInfo(ctx.input.fileId);
    await ctx.addAttachment({
      type: 'url',
      url: client.fileDownloadUrl(ctx.input.fileId),
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });
    return {
      output: {
        fileId: ctx.input.fileId,
        fileName: info.name,
        fileSize: info.size,
        isSizeLimited: info.preview
      },
      message: `Prepared **${info.name}** for download.${info.preview ? ' The file exceeds your current plan limit.' : ''}`
    };
  })
  .build();
