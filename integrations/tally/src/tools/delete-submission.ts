import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSubmission = SlateTool.create(spec, {
  name: 'Delete Submission',
  key: 'delete_submission',
  description: `Delete a specific form submission from a Tally form. This permanently removes the submission and its responses.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The form ID the submission belongs to'),
      submissionId: z.string().describe('The submission ID to delete')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Form the submission was deleted from'),
      submissionId: z.string().describe('ID of the deleted submission'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteSubmission(ctx.input.formId, ctx.input.submissionId);

    return {
      output: {
        formId: ctx.input.formId,
        submissionId: ctx.input.submissionId,
        deleted: true
      },
      message: `Deleted submission **${ctx.input.submissionId}** from form **${ctx.input.formId}**.`
    };
  })
  .build();
