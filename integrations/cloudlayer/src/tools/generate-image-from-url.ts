import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attachJobFile } from '../lib/files';
import { generationOutput } from '../lib/responses';
import {
  authenticationSchema,
  cookieSchema,
  imageOptionsSchema,
  jobResponseSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let generateImageFromUrl = SlateTool.create(spec, {
  name: 'Generate Image from URL',
  key: 'generate_image_from_url',
  description: `Capture a publicly accessible web page and convert it into an image (PNG, JPG, or WebP). Useful for turning dashboards or web pages into image snapshots.
Optionally provide HTTP Basic Auth credentials or session cookies if the target URL requires authentication.
The API call is asynchronous by default and returns a job ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    imageOptionsSchema.extend({
      url: z.string().describe('URL of the web page to capture'),
      authentication: authenticationSchema,
      cookies: z
        .array(cookieSchema)
        .optional()
        .describe('Session cookies to set before navigating to the URL'),
      webhook: z
        .string()
        .optional()
        .describe('HTTPS URL to receive a webhook notification when the job completes')
    })
  )
  .output(jobResponseSchema)
  .handleInvocation(async ctx => {
    if (!ctx.input.url.trim()) throw createApiServiceError('Provide a URL to capture.');
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateImageFromUrl(ctx.input);

    let output = generationOutput(result);
    await attachJobFile(ctx, result);
    return {
      output,
      message: `Generation job **${output.jobId}** has status **${output.status}**. Use get_job to check progress, then retrieve_job_asset to download the result.`
    };
  })
  .build();
