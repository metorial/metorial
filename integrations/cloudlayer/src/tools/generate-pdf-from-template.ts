import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attachJobFile } from '../lib/files';
import { generationOutput } from '../lib/responses';
import { jobResponseSchema, pdfOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let generatePdfFromTemplate = SlateTool.create(spec, {
  name: 'Generate PDF from Template',
  key: 'generate_pdf_from_template',
  description: `Generate a PDF document using a predefined template from the Cloudlayer gallery or a custom Nunjucks HTML template. Pass in your dynamic data to populate template variables.
For predefined templates, provide the **templateId** and matching **templateData**. For custom templates, provide a base64-encoded HTML template string.
The API call is asynchronous by default and returns a job ID.`,
  instructions: [
    'Provide either templateId (for a gallery template) or template (base64-encoded custom HTML), not both.',
    'Template data is injected into template placeholders using Nunjucks syntax.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    pdfOptionsSchema.extend({
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
    if (Boolean(ctx.input.templateId?.trim()) === Boolean(ctx.input.template?.trim()))
      throw createApiServiceError('Provide exactly one of templateId or template.');
    let client = new Client({ token: ctx.auth.token });

    let { templateData, ...rest } = ctx.input;
    let result = await client.generatePdfFromTemplate({
      ...rest,
      data: templateData
    });

    let output = generationOutput(result);
    await attachJobFile(ctx, result);
    return {
      output,
      message: `Generation job **${output.jobId}** has status **${output.status}**. Use get_job to check progress, then retrieve_job_asset to download the result.`
    };
  })
  .build();
