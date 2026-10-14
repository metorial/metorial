import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let getFileDownloadUrl = SlateTool.create(spec, {
  name: 'Get File Download URL',
  key: 'get_file_download_url',
  description: `Prepare a downloadable file and return its signed download URL. The URL is short-lived; request a new one if you need to use it later.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to generate a download URL for')
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().describe('Signed URL to download the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    let downloadUrl = await client.getDownloadUrl(ctx.input.fileId);

    await ctx.addAttachment({
      type: 'url',
      url: downloadUrl,
      refreshReference: { fileId: ctx.input.fileId },
      refreshAt: new Date().toISOString()
    });

    return {
      output: { downloadUrl },
      message: `Generated download URL for file \`${ctx.input.fileId}\`.`
    };
  })
  .build();
