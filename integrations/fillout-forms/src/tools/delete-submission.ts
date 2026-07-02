import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSubmission = SlateTool.create(spec, {
  name: 'Delete Submission',
  key: 'delete_submission',
  description: `Permanently delete a specific submission from a form. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('Public identifier of the form'),
      submissionId: z.string().describe('Unique identifier of the submission to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl || ctx.config.baseUrl
    });

    await client.deleteSubmission(ctx.input.formId, ctx.input.submissionId);

    return {
      output: { success: true },
      message: `Deleted submission \`${ctx.input.submissionId}\` from form \`${ctx.input.formId}\`.`
    };
  })
  .build();
