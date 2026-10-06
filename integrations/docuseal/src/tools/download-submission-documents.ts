import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deliverDocuments } from '../lib/files';
import { spec } from '../spec';

export const downloadSubmissionDocuments = SlateTool.create(spec, {
  key: 'download_submission_documents',
  name: 'Download Submission Documents',
  description:
    'Download available PDFs for an exact submission, optionally merged. Pending submissions return previews; completed submissions return completed documents. Retrieval can generate and retain previews. The total download limit is 64 MiB.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      submissionId: z
        .number()
        .describe('Submission ID from get_submission or list_submissions'),
      mergeDocuments: z
        .boolean()
        .optional()
        .describe('Request one merged PDF when multiple documents are available')
    })
  )
  .output(
    z.object({
      submissionId: z.number(),
      documents: z.array(
        z.object({ name: z.string(), size: z.number(), mimeType: z.string() })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    const native = await client.getSubmissionDocuments(
      ctx.input.submissionId,
      ctx.input.mergeDocuments
    );
    const documents = await deliverDocuments(ctx, native.documents, ctx.auth.token);
    return {
      output: { submissionId: native.id, documents },
      message: 'Submission PDFs are ready to download.'
    };
  })
  .build();
