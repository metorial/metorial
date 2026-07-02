import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { imageOptionsSchema, jobResponseSchema } from '../lib/schemas';
import { spec } from '../spec';

export let generateImageFromTemplate = SlateTool.create(spec, {
  name: 'Generate Image from Template',
  key: 'generate_image_from_template',
  description: `Generate an image (PNG, JPG, or WebP) using a predefined template from the Cloudlayer gallery or a custom Nunjucks HTML template. Pass in your dynamic data to populate template variables.
For predefined templates, provide the **templateId** and matching **templateData**. For custom templates, provide a base64-encoded HTML template string.
The API call is asynchronous by default and returns a job ID.`,
  instructions: [
    'Provide either templateId (for a gallery template) or template (base64-encoded custom HTML), not both.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    imageOptionsSchema.extend({
      templateId: z
        .string()
        .optional()
        .describe('ID of a predefined template from the Cloudlayer template gallery'),
      template: z
        .string()
        .optional()
        .describe('Custom HTML template as a base64-encoded string (Nunjucks syntax)'),
      templateData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Key-value data to inject into template placeholders'),
      webhook: z
        .string()
        .optional()
        .describe('HTTPS URL to receive a webhook notification when the job completes')
    })
  )
  .output(jobResponseSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { templateData, ...rest } = ctx.input;
    let result = await client.generateImageFromTemplate({
      ...rest,
      data: templateData
    });

    return {
      output: {
        jobId: result.jobId ?? result.id ?? '',
        status: result.status ?? 'pending',
        assetUrl: result.assetUrl ?? result.url,
        previewUrl: result.previewUrl,
        timestamp: result.timestamp
      },
      message: `Image generation from template started with job ID **${result.jobId ?? result.id}** (status: ${result.status ?? 'pending'}).`
    };
  })
  .build();
