import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudFunctionsActionScopes } from '../scopes';
import { spec } from '../spec';

export let generateDownloadUrl = SlateTool.create(spec, {
  name: 'Generate Download URL',
  key: 'generate_download_url',
  description: `Generate a signed URL for downloading the source code of a deployed Cloud Function. The URL is time-limited and can be used to retrieve the function's source archive.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudFunctionsActionScopes.generateDownloadUrl)
  .input(
    z.object({
      functionName: z.string().describe('Short function name (e.g. "my-function")'),
      location: z
        .string()
        .optional()
        .describe('Region where the function is deployed. Defaults to configured region.')
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().describe('Signed URL to download the function source code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.input.location || ctx.config.region
    });

    let response = await client.generateDownloadUrl(
      ctx.input.functionName,
      ctx.input.location
    );

    return {
      output: {
        downloadUrl: response.downloadUrl
      },
      message: `Download URL generated for function **${ctx.input.functionName}**. The URL is time-limited.`
    };
  })
  .build();
