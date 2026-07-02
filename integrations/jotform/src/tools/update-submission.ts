import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSubmissionTool = SlateTool.create(spec, {
  name: 'Update Submission',
  key: 'update_submission',
  description: `Update an existing form submission's answer values. Only the provided fields will be updated; other fields remain unchanged.`,
  instructions: [
    'Answers are keyed by question ID, same format as creating a submission.',
    'Only provided question IDs will be updated — omitted questions remain unchanged.'
  ]
})
  .input(
    z.object({
      submissionId: z.string().describe('ID of the submission to update'),
      answers: z
        .record(z.string(), z.any())
        .describe('Map of question IDs to new answer values')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('ID of the updated submission'),
      updated: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    await client.updateSubmission(ctx.input.submissionId, ctx.input.answers);

    return {
      output: {
        submissionId: ctx.input.submissionId,
        updated: true
      },
      message: `Updated submission **${ctx.input.submissionId}**.`
    };
  })
  .build();
