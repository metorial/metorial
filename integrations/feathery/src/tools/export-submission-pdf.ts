import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let exportSubmissionPdf = SlateTool.create(spec, {
  name: 'Export Submission as PDF',
  key: 'export_submission_pdf',
  description: `Generate a PDF export of a form submission for a specific user. Provides the generated PDF for download. A completed submission uses its existing exported PDF.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form'),
      userId: z.string().describe('ID of the user whose submission to export')
    })
  )
  .output(
    z.object({
      pdfUrl: z.string().optional().describe('URL to the generated PDF'),
      exported: z.boolean().describe('Whether the export was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region:
        ctx.auth.region ??
        ('region' in ctx.config && typeof ctx.config.region === 'string'
          ? ctx.config.region
          : undefined)
    });

    let result = await client.exportSubmissionPdf({
      formId: ctx.input.formId,
      userId: ctx.input.userId
    });

    let pdfUrl = result.pdf_url || result.url || result.file_url;
    if (
      typeof pdfUrl !== 'string' ||
      !URL.canParse(pdfUrl) ||
      !['http:', 'https:'].includes(new URL(pdfUrl).protocol)
    ) {
      throw createApiServiceError(
        'Feathery did not return a submission PDF URL. Retry the export.'
      );
    }
    await client.waitForSubmissionPdf(pdfUrl);
    await ctx.addAttachment({ type: 'url', url: pdfUrl, mimeType: 'application/pdf' });

    return {
      output: {
        pdfUrl,
        exported: true
      },
      message: `Exported submission PDF for user **${ctx.input.userId}** on form **${ctx.input.formId}**.`
    };
  })
  .build();
