import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let deleteOccurrence = SlateTool.create(spec, {
  name: 'Delete Occurrence',
  key: 'delete_occurrence',
  description:
    'Request permanent deletion of one numeric occurrence ID. Deletion is asynchronous and can take several minutes. It does not update item counts or refund occurrence quota. Check get_occurrence until the occurrence is no longer available.',
  tags: { destructive: true }
})
  .input(
    z.object({
      occurrenceId: z
        .string()
        .describe('Numeric occurrence ID from list_occurrences; not the ingestion UUID'),
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.')
    })
  )
  .output(
    z.object({
      occurrenceId: z.string().describe('Occurrence requested for deletion'),
      deletionRequested: z
        .boolean()
        .describe('Whether the asynchronous deletion request was accepted')
    })
  )
  .handleInvocation(async ctx => {
    await createClient(ctx).deleteOccurrence(ctx.input.occurrenceId);
    return {
      output: { occurrenceId: ctx.input.occurrenceId, deletionRequested: true },
      message: `Deletion requested for occurrence ${ctx.input.occurrenceId}. Completion is asynchronous.`
    };
  })
  .build();
