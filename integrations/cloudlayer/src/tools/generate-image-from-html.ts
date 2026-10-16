import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attachJobFile } from '../lib/files';
import { generationOutput } from '../lib/responses';
import { imageOptionsSchema, jobResponseSchema } from '../lib/schemas';
import { spec } from '../spec';

export let generateImageFromHtml = SlateTool.create(spec, {
  name: 'Generate Image from HTML',
  key: 'generate_image_from_html',
  description: `Convert HTML content into an image (PNG, JPG, or WebP). Provide your HTML as a **base64-encoded string** — it can include JavaScript, CSS, custom fonts, and image imports.
Configure viewport dimensions, device scale factor, output format, and enable transparent backgrounds for PNG/WebP.
The API call is asynchronous by default and returns a job ID.`,
  instructions: [
    'The html parameter must be a base64-encoded string of your HTML content.',
    'Transparent backgrounds only work with PNG and WebP output formats.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    imageOptionsSchema.extend({
      html: z.string().describe('Base64-encoded HTML content to convert to an image'),
      webhook: z
        .string()
        .optional()
        .describe('HTTPS URL to receive a webhook notification when the job completes')
    })
  )
  .output(jobResponseSchema)
  .handleInvocation(async ctx => {
    if (!ctx.input.html.trim())
      throw createApiServiceError('Provide base64-encoded HTML content.');
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateImageFromHtml(ctx.input);

    let output = generationOutput(result);
    await attachJobFile(ctx, result);
    return {
      output,
      message: `Generation job **${output.jobId}** has status **${output.status}**. Use get_job to check progress, then retrieve_job_asset to download the result.`
    };
  })
  .build();
