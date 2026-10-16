import { SlateTool } from 'slates';
import { z } from 'zod';
import { attachDownload } from '../lib/downloads';
import { createClient } from '../lib/helpers';
import { projectIdSchema, rawSchema } from '../lib/schemas';
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
      projectId: projectIdSchema,
      fileId: z.number().describe('The file ID to download')
    })
  )
  .output(
    z.object({
      raw: rawSchema,
      downloadUrl: z.string().describe('URL to download the file'),
      expiresAt: z.string().optional().describe('Provider URL expiration timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.downloadFile(ctx.input.projectId, ctx.input.fileId);

    const file = await attachDownload(ctx, result, {
      kind: 'source',
      projectId: ctx.input.projectId,
      fileId: ctx.input.fileId
    });
    return {
      output: { raw: client.lastResponse, downloadUrl: result.url, expiresAt: file.expiresAt },
      message: `Download URL generated for file **${ctx.input.fileId}**.`
    };
  })
  .build();
