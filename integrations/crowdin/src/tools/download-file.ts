import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let downloadFileTool = SlateTool.create(spec, {
  name: 'Download Source File',
  key: 'download_file',
  description: `Get a download URL for a source file in a Crowdin project. The URL can be used to retrieve the original source file content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      fileId: z.number().describe('The file ID to download')
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().describe('URL to download the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.downloadFile(ctx.input.projectId, ctx.input.fileId);

    return {
      output: {
        downloadUrl: result.url
      },
      message: `Download URL generated for file **${ctx.input.fileId}**.`
    };
  })
  .build();
