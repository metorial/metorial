import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attachJobFile } from '../lib/files';
import { generationOutput } from '../lib/responses';
import { jobResponseSchema, pdfOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let generatePdfFromHtml = SlateTool.create(spec, {
  name: 'Generate PDF from HTML',
  key: 'generate_pdf_from_html',
  description: `Convert HTML content into a PDF document. Provide your HTML as a **base64-encoded string** — it can include JavaScript, CSS, imported fonts, embedded images, and external resources. Configure paper format, margins, headers/footers, orientation, and more.
The API call is asynchronous by default and returns a job ID. Use get_job to check completion, then retrieve_job_asset to download the result.`,
  instructions: [
    'The html parameter must be a base64-encoded string of your HTML content.',
    'Custom width and height take precedence over the corresponding format dimensions.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    pdfOptionsSchema.extend({
      html: z.string().describe('Base64-encoded HTML content to convert to PDF'),
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

    let result = await client.generatePdfFromHtml(ctx.input);

    let output = generationOutput(result);
    await attachJobFile(ctx, result);
    return {
      output,
      message: `Generation job **${output.jobId}** has status **${output.status}**. Use get_job to check progress, then retrieve_job_asset to download the result.`
    };
  })
  .build();
