import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    'Provide either a single url or a batch array of URLs, not both.',
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
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generatePdfFromUrl(ctx.input);

    let sourceDesc = ctx.input.batch
      ? `${ctx.input.batch.length} URLs (batch)`
      : (ctx.input.url ?? 'provided URL');

    return {
      output: {
        jobId: result.jobId ?? result.id ?? '',
        status: result.status ?? 'pending',
        assetUrl: result.assetUrl ?? result.url,
        previewUrl: result.previewUrl,
        timestamp: result.timestamp
      },
      message: `PDF generation from ${sourceDesc} started with job ID **${result.jobId ?? result.id}** (status: ${result.status ?? 'pending'}).`
    };
  })
  .build();
