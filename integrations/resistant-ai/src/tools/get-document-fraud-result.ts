import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocumentsClient } from '../lib/documents-client';
import { spec } from '../spec';

export let getDocumentFraudResult = SlateTool.create(spec, {
  name: 'Get Document Fraud Result',
  key: 'get_document_fraud_result',
  description:
    'Retrieves the Resistant Documents fraud analysis result, including its processing status, fraud score, document tags, and detailed indicators. Reports when the result is not yet available and preserves the full response.',
  instructions: [
    'Use a Resistant Documents Client Credentials connection and a submissionId returned by submit_document.',
    'When ready is false, confirm the submission ID and retry using exponential backoff with jitter, capping intervals at 45 seconds and stopping after 15 minutes.',
    'SUCCESS, FAILED, INVALID_INPUT, and SKIPPED are terminal processing statuses. A ready result may describe failed processing rather than a successful analysis.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      submissionId: z.string().describe('Submission ID returned by submit_document'),
      withMetadata: z
        .boolean()
        .optional()
        .describe('Include indicator metadata in the fraud result; defaults to false')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Submission whose analysis was requested'),
      ready: z
        .boolean()
        .describe(
          'Whether a processing result is available; false may also indicate an unknown submission ID'
        ),
      status: z.string().optional().describe('Processing status returned by the provider'),
      result: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Complete fraud analysis response, including indicators and provider metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocumentsClient(ctx.auth);
    let response = await client.getFraudResult(ctx.input.submissionId, ctx.input.withMetadata);
    let status =
      typeof response.result?.status === 'string' ? response.result.status : undefined;
    return {
      output: { submissionId: ctx.input.submissionId, ...response, status },
      message: response.ready
        ? `Document analysis \`${ctx.input.submissionId}\`: **${status}**.`
        : `The fraud result for \`${ctx.input.submissionId}\` is not available. Confirm the ID and retry with backoff, stopping after 15 minutes.`
    };
  })
  .build();
