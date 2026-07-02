import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSubmission = SlateTool.create(spec, {
  name: 'Delete Submission',
  key: 'delete_submission',
  description: `Permanently delete a form submission. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      submissionId: z.number().describe('ID of the submission to delete.')
    })
  )
  .output(
    z.object({
      submissionId: z.number().describe('ID of the deleted submission.'),
      deleted: z.boolean().describe('Whether the deletion was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteSubmission(ctx.input.submissionId);

    return {
      output: {
        submissionId: ctx.input.submissionId,
        deleted: true
      },
      message: `Deleted submission **#${ctx.input.submissionId}**.`
    };
  })
  .build();
