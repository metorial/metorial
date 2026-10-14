import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocumentsClient } from '../lib/documents-client';
import { spec } from '../spec';

export let deleteDocumentSubmission = SlateTool.create(spec, {
  name: 'Delete Document Submission',
  key: 'delete_document_submission',
  description:
    'Permanently deletes a Resistant Documents submission before its retention period expires. Use the submission ID returned by submit_document. Requires a Resistant Documents Client Credentials connection.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      submissionId: z
        .string()
        .describe('Submission ID returned by submit_document to permanently delete')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Deleted submission ID'),
      deleted: z.boolean().describe('True after the provider confirms deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocumentsClient(ctx.auth);
    await client.deleteSubmission(ctx.input.submissionId);
    return {
      output: { submissionId: ctx.input.submissionId, deleted: true },
      message: `Deleted document submission \`${ctx.input.submissionId}\`.`
    };
  })
  .build();
