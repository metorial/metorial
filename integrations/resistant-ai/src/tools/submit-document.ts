import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocumentsClient } from '../lib/documents-client';
import { spec } from '../spec';

export let submitDocument = SlateTool.create(spec, {
  name: 'Submit Document for Fraud Analysis',
  key: 'submit_document',
  description:
    'Creates a Resistant Documents submission and uploads the original PDF or image bytes for fraud analysis. Returns the submission ID for retrieving results or deleting the document.',
  instructions: [
    'Use a Resistant Documents Client Credentials connection.',
    'Encode the original file bytes as base64 without modifying or re-saving the document. The service receives decoded binary bytes.',
    'Use an opaque queryId without names, email addresses, or other personal information.',
    'After upload, call get_document_fraud_result with the returned submissionId. Analysis is asynchronous.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      fileBase64: z
        .string()
        .describe(
          'Base64-encoded original PDF or image file bytes, without a data URL prefix'
        ),
      queryId: z
        .string()
        .optional()
        .describe(
          'Optional opaque correlation ID, at most 1024 characters; must not contain personal information'
        )
    })
  )
  .output(
    z.object({
      submissionId: z
        .string()
        .describe('Submission ID used to retrieve results or delete the document'),
      queryId: z.string().optional().describe('Correlation ID supplied with the submission'),
      status: z
        .string()
        .describe(
          'Upload status; uploaded means document bytes were accepted for asynchronous analysis'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocumentsClient(ctx.auth);
    let output = await client.submitDocument(ctx.input.fileBase64, ctx.input.queryId);
    return {
      output,
      message: `Document uploaded for analysis. Submission ID: \`${output.submissionId}\`. Retrieve the fraud result after processing completes.`
    };
  })
  .build();
