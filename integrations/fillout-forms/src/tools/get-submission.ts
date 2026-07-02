import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { submissionSchema } from '../lib/types';
import { spec } from '../spec';

export let getSubmission = SlateTool.create(spec, {
  name: 'Get Submission',
  key: 'get_submission',
  description: `Retrieve a single submission by its ID, including all question responses, calculations, scheduling details, payment information, and quiz scores. Optionally includes an edit link for the submission.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('Public identifier of the form'),
      submissionId: z.string().describe('Unique identifier of the submission'),
      includeEditLink: z
        .boolean()
        .optional()
        .describe('Include an edit link for the submission')
    })
  )
  .output(submissionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl || ctx.config.baseUrl
    });

    let result = await client.getSubmission(
      ctx.input.formId,
      ctx.input.submissionId,
      ctx.input.includeEditLink
    );

    // The API wraps the submission in a { submission: ... } envelope
    let submission = result.submission ?? result;

    return {
      output: submission,
      message: `Retrieved submission \`${submission.submissionId}\` submitted at ${submission.submissionTime}.`
    };
  })
  .build();
