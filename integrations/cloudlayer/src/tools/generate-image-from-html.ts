import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateImageFromHtml(ctx.input);

    return {
      output: {
        jobId: result.jobId ?? result.id ?? '',
        status: result.status ?? 'pending',
        assetUrl: result.assetUrl ?? result.url,
        previewUrl: result.previewUrl,
        timestamp: result.timestamp
      },
      message: `Image generation job created with ID **${result.jobId ?? result.id}** (status: ${result.status ?? 'pending'}).`
    };
  })
  .build();
