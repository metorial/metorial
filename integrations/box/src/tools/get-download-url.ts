import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDownloadUrl = SlateTool.create(spec, {
  name: 'Get Download URL',
  key: 'get_download_url',
  description: `Get a temporary download URL for a Box file. The URL can be used to download the file content directly.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('The unique ID of the file to download')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('The file ID'),
      downloadUrl: z.string().describe('Temporary direct download URL for the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let downloadUrl = await client.getDownloadUrl(ctx.input.fileId);

    return {
      output: {
        fileId: ctx.input.fileId,
        downloadUrl
      },
      message: `Generated download URL for file ${ctx.input.fileId}.`
    };
  });
