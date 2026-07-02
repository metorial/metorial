import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a previously generated file from API2PDF servers. By default files are auto-deleted after 24 hours, but this tool allows immediate deletion for high-security use cases. Use the responseId returned from the original generation request.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      responseId: z
        .string()
        .describe('The responseId returned from the original file generation request')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the file was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    await client.deleteFile(ctx.input.responseId);

    return {
      output: {
        deleted: true
      },
      message: `Successfully deleted file with response ID **${ctx.input.responseId}**.`
    };
  })
  .build();
