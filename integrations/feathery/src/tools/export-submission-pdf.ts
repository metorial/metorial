import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let exportSubmissionPdf = SlateTool.create(spec, {
  name: 'Export Submission as PDF',
  key: 'export_submission_pdf',
  description: `Generate a PDF export of a form submission for a specific user. Returns the URL or content of the generated PDF.`,
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
      region: ctx.config.region
    });

    let result = await client.exportSubmissionPdf({
      formId: ctx.input.formId,
      userId: ctx.input.userId
    });

    return {
      output: {
        pdfUrl: result.url || result.file_url || result.pdf_url,
        exported: true
      },
      message: `Exported submission PDF for user **${ctx.input.userId}** on form **${ctx.input.formId}**.`
    };
  })
  .build();
