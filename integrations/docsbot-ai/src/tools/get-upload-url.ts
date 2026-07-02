import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let getUploadUrl = SlateTool.create(spec, {
  name: 'Get Upload URL',
  key: 'get_upload_url',
  description: `Get a presigned upload URL for uploading a file to use as a bot training source. After uploading the file to the returned URL, use the returned file path with the **Create Source** tool.`,
  instructions: [
    'Upload the file to the returned uploadUrl using a PUT request with Content-Type: application/octet-stream.',
    'Then pass the returned filePath to the Create Source tool\'s "file" field.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID to upload the file for'),
      fileName: z.string().describe('Name of the file to upload')
    })
  )
  .output(
    z.object({
      uploadUrl: z
        .string()
        .describe('Presigned URL to upload the file to (PUT with application/octet-stream)'),
      filePath: z.string().describe('Cloud storage path to use when creating the source')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    let result = await client.getUploadUrl(
      ctx.config.teamId,
      ctx.input.botId,
      ctx.input.fileName
    );

    return {
      output: {
        uploadUrl: result.url,
        filePath: result.file
      },
      message: `Upload URL generated for **${ctx.input.fileName}**. Upload the file to the URL, then use file path \`${result.file}\` when creating the source.`
    };
  })
  .build();
