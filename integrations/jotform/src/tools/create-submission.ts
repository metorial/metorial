import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSubmissionTool = SlateTool.create(spec, {
  name: 'Create Submission',
  key: 'create_submission',
  description: `Create a new submission for a JotForm form. Provide answers mapped to question IDs. Note: submissions created via the API do **not** trigger webhooks.`,
  instructions: [
    'Answers are keyed by question ID (get question IDs using Get Form or List Forms tools).',
    'For simple fields (text, email, number), provide the value directly as a string.',
    'For compound fields (name, address), provide an object with sub-field keys (e.g., {"first": "John", "last": "Doe"}).'
  ],
  constraints: ['API-created submissions do not trigger form webhooks.']
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to submit to'),
      answers: z
        .record(z.string(), z.any())
        .describe(
          'Map of question IDs to answer values. Simple fields: string value. Compound fields: object with sub-keys.'
        )
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('ID of the newly created submission')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let result = await client.createSubmission(ctx.input.formId, ctx.input.answers);

    return {
      output: {
        submissionId: String(result.submissionID || result.id || result)
      },
      message: `Created submission for form **${ctx.input.formId}**.`
    };
  })
  .build();
