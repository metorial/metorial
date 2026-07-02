import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { jobResponseSchema, pdfOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let generatePdfFromHtml = SlateTool.create(spec, {
  name: 'Generate PDF from HTML',
  key: 'generate_pdf_from_html',
  description: `Convert HTML content into a PDF document. Provide your HTML as a **base64-encoded string** — it can include JavaScript, CSS, imported fonts, embedded images, and external resources. Configure paper format, margins, headers/footers, orientation, and more.
The API call is asynchronous by default and returns a job ID. Use the **Get Job** tool to check completion and retrieve the asset URL.`,
  instructions: [
    'The html parameter must be a base64-encoded string of your HTML content.',
    'Use format (e.g. "a4", "letter") OR custom width/height — not both.'
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
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generatePdfFromHtml(ctx.input);

    return {
      output: {
        jobId: result.jobId ?? result.id ?? '',
        status: result.status ?? 'pending',
        assetUrl: result.assetUrl ?? result.url,
        previewUrl: result.previewUrl,
        timestamp: result.timestamp
      },
      message: `PDF generation job created with ID **${result.jobId ?? result.id}** (status: ${result.status ?? 'pending'}).`
    };
  })
  .build();
