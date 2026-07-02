import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let getFileDownloadUrl = SlateTool.create(spec, {
  name: 'Get File Download URL',
  key: 'get_file_download_url',
  description: `Generate a signed download URL for a specific file. The URL can be used to download the file's content directly.`,
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

    return {
      output: { downloadUrl },
      message: `Generated download URL for file \`${ctx.input.fileId}\`.`
    };
  })
  .build();
