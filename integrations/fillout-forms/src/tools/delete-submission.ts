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
      formId: z.string().describe('Form ID. Call list_forms to discover forms.'),
      submissionId: z.string().describe('Unique identifier of the submission to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether Fillout accepted the exact deletion'),
      formId: z.string(),
      submissionId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl || ctx.config.baseUrl
    });

    const result = await client.deleteSubmission(ctx.input.formId, ctx.input.submissionId);

    return {
      output: result,
      message: `Deleted submission \`${ctx.input.submissionId}\` from form \`${ctx.input.formId}\`.`
    };
  })
  .build();
