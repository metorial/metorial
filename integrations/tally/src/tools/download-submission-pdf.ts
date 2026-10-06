import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, incomplete, nonempty } from '../lib/contracts';
import { spec } from '../spec';
export const downloadSubmissionPdf = SlateTool.create(spec, {
  name: 'Download Submission PDF',
  key: 'download_submission_pdf',
  description:
    'Download the PDF belonging to one exact Tally form submission. The native signed URL grants access to this PDF.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      formId: z.string().describe('Exact form ID'),
      submissionId: z.string().describe('Exact submission ID belonging to that form')
    })
  )
  .output(
    z.object({
      formId: z.string(),
      submissionId: z.string(),
      filename: z.string(),
      mimeType: z.literal('application/pdf')
    })
  )
  .handleInvocation(async ctx => {
    const formId = id(ctx.input.formId),
      submissionId = id(ctx.input.submissionId);
    const data = await new Client(ctx.auth).getSubmission(formId, submissionId);
    const signed = nonempty(data.native.pdfUrl);
    let url: URL;
    try {
      url = new URL(signed);
    } catch {
      return incomplete();
    }
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'api.tally.so' ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      url.pathname !==
        `/forms/${encodeURIComponent(formId)}/submissions/${encodeURIComponent(submissionId)}/pdf`
    )
      incomplete();
    const filename = `submission-${submissionId}.pdf`;
    await ctx.addAttachment({
      type: 'url',
      url: signed,
      filename,
      mimeType: 'application/pdf'
    });
    return {
      output: { formId, submissionId, filename, mimeType: 'application/pdf' as const },
      message: 'The exact submission PDF is ready to download.'
    };
  })
  .build();
