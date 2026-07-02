import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSubmissionTool = SlateTool.create(spec, {
  name: 'Delete Submission',
  key: 'delete_submission',
  description: `Delete a form submission by its ID. This permanently removes the submission and its associated data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      submissionId: z.string().describe('ID of the submission to delete')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('ID of the deleted submission'),
      deleted: z.boolean().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    await client.deleteSubmission(ctx.input.submissionId);

    return {
      output: {
        submissionId: ctx.input.submissionId,
        deleted: true
      },
      message: `Deleted submission **${ctx.input.submissionId}**.`
    };
  })
  .build();
