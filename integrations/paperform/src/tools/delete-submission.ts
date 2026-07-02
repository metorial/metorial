import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSubmission = SlateTool.create(spec, {
  name: 'Delete Submission',
  key: 'delete_submission',
  description: `Permanently delete a form submission by its ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      submissionId: z.string().describe('The unique submission ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteSubmission(ctx.input.submissionId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted submission **${ctx.input.submissionId}**.`
    };
  })
  .build();
