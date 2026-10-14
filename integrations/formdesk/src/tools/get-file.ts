import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieves an uploaded file associated with a form submission by its file name or ID. Provides a downloadable file with its MIME type. Call list_files to discover file IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileNameOrId: z
        .string()
        .describe(
          'The file ID to retrieve. Call list_files to discover file IDs; filename lookup depends on provider support.'
        )
    })
  )
  .output(
    z.object({
      contentType: z.string().describe('MIME type of the file'),
      fileName: z.string().describe('The file name or ID used to retrieve the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Downloading file...');
    let result = await client.getFile(ctx.input.fileNameOrId);

    await ctx.addAttachment({
      type: 'url',
      url: result.url,
      mimeType: result.contentType,
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });

    return {
      output: {
        contentType: result.contentType,
        fileName: result.fileName
      },
      message: `Successfully downloaded file "${ctx.input.fileNameOrId}".`
    };
  })
  .build();
