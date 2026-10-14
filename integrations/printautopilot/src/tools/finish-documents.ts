import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let finishDocuments = SlateTool.create(spec, {
  name: 'Record Print Results',
  key: 'finish_documents',
  description:
    'Records whether queued documents printed successfully or failed. Use document IDs from list_print_jobs after the physical printing attempt.',
  instructions: [
    'Mark a document successful only after the connected printer completed printing it.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      documents: z
        .array(
          z.object({
            id: z
              .number()
              .positive()
              .refine(Number.isSafeInteger, 'Document ID must be a whole number.')
              .describe('Document ID from list_print_jobs.'),
            state: z
              .enum(['failed', 'success'])
              .describe('Result of the physical printing attempt.'),
            err_msg: z.string().optional().describe('Failure details when state is failed.')
          })
        )
        .min(1)
        .describe('Printing results to record.')
    })
  )
  .output(
    z.object({
      rawResponse: z.unknown().describe('Provider confirmation of updated document results.')
    })
  )
  .handleInvocation(async ctx => {
    let rawResponse = await new Client(ctx.auth.token).finishDocuments(ctx.input.documents);
    return { output: { rawResponse }, message: 'Recorded the document printing results.' };
  })
  .build();
