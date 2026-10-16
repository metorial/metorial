import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attachJobFile } from '../lib/files';
import { generationOutput } from '../lib/responses';
import {
  authenticationSchema,
  cookieSchema,
  jobResponseSchema,
  pdfOptionsSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let generatePdfFromUrl = SlateTool.create(spec, {
  name: 'Generate PDF from URL',
  key: 'generate_pdf_from_url',
  description: `Capture a publicly accessible web page and convert it into a PDF document. Supports batch processing — provide an array of URLs to combine into a single multi-page PDF.
Optionally provide HTTP Basic Auth credentials or session cookies if the target URL requires authentication.
The API call is asynchronous by default and returns a job ID.`,
  instructions: [
    'Provide a single url or a non-empty batch array. When both are supplied, the provider uses batch.',
    'Batch mode combines multiple URLs into one multi-page PDF document.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    pdfOptionsSchema.extend({
      url: z.string().optional().describe('URL of the web page to capture'),
      batch: z
        .array(z.string())
        .optional()
        .describe('Array of URLs to convert and combine into a single PDF'),
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
    if (!ctx.input.url?.trim() && !ctx.input.batch?.length)
      throw createApiServiceError('Provide a url or a non-empty batch of URLs.');
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generatePdfFromUrl(ctx.input);

    let output = generationOutput(result);
    await attachJobFile(ctx, result);
    return {
      output,
      message: `Generation job **${output.jobId}** has status **${output.status}**. Use get_job to check progress, then retrieve_job_asset to download the result.`
    };
  })
  .build();
