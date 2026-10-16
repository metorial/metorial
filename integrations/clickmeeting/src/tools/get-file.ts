import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieves metadata for a file in the file library and optionally its download URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file'),
      includeDownloadUrl: z
        .boolean()
        .default(false)
        .describe('Whether to include the download URL')
    })
  )
  .output(
    z.object({
      file: z.record(z.string(), z.unknown()).describe('File metadata'),
      downloadUrl: z.string().optional().describe('Download URL for the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let file = await client.getFile(ctx.input.fileId);
    let downloadUrl: string | undefined;

    if (ctx.input.includeDownloadUrl) {
      downloadUrl = `https://api.clickmeeting.com/v1/file-library/${encodeURIComponent(ctx.input.fileId)}/download`;
      await ctx.addAttachment({
        type: 'url',
        url: downloadUrl,
        headers: { 'X-Api-Key': ctx.auth.token }
      });
    }

    return {
      output: { file, downloadUrl },
      message: `Retrieved file **${ctx.input.fileId}**${downloadUrl ? ' with download URL' : ''}.`
    };
  })
  .build();
