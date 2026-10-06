import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConvexClient } from '../lib/client';
import { spec } from '../spec';

export let generateUploadUrl = SlateTool.create(spec, {
  name: 'Generate Upload URL',
  key: 'generate_upload_url',
  description: `Generate a temporary upload URL for uploading a file to Convex file storage.
The returned URL can be used to POST file content directly. After uploading, a storage ID is returned that can be referenced in documents.
Requires a deployed mutation that returns ctx.storage.generateUploadUrl().`,
  instructions: [
    'The returned URL is temporary and should be used immediately',
    'POST file content to the URL with the appropriate Content-Type header',
    'The upload response will contain a storageId to reference the file in documents'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      functionPath: z
        .string()
        .optional()
        .describe(
          'Deployed mutation returning ctx.storage.generateUploadUrl(), such as files:generateUploadUrl. Required to generate the URL.'
        ),
      args: z
        .record(z.string(), z.any())
        .optional()
        .describe('Arguments expected by the upload mutation.')
    })
  )
  .output(
    z.object({
      uploadUrl: z.string().describe('Temporary URL for uploading a file via POST')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConvexClient({
      deploymentUrl: ctx.config.deploymentUrl,
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    ctx.progress('Generating upload URL...');
    let uploadUrl = await client.generateUploadUrl(ctx.input.functionPath, ctx.input.args);

    return {
      output: {
        uploadUrl
      },
      message: `Upload URL generated. POST file content to the URL with the appropriate Content-Type header.`
    };
  })
  .build();
