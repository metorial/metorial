import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z.object({
  key: z.string().describe('Unique question identifier'),
  label: z.string().describe('Human-readable field label'),
  type: z.string().describe('Field type (e.g., INPUT_TEXT, INPUT_EMAIL, MULTIPLE_CHOICE)'),
  value: z.any().describe('Submitted value')
});

export let getSubmission = SlateTool.create(spec, {
  name: 'Get Submission',
  key: 'get_submission',
  description: `Retrieve a specific form submission with all its responses and the associated form questions. Use this to inspect individual submission details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The form ID the submission belongs to'),
      submissionId: z.string().describe('The submission ID to retrieve')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique submission identifier'),
      respondentId: z.string().describe('Unique respondent identifier'),
      formId: z.string().describe('Form this submission belongs to'),
      formName: z.string().describe('Name of the form'),
      createdAt: z.string().describe('ISO 8601 submission timestamp'),
      fields: z.array(fieldSchema).describe('Submitted field values'),
      questions: z
        .array(
          z.object({
            key: z.string().describe('Question key'),
            label: z.string().describe('Question label'),
            type: z.string().describe('Question type')
          })
        )
        .describe('Form questions for context')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let submission = await client.getSubmission(ctx.input.formId, ctx.input.submissionId);

    return {
      output: {
        submissionId: submission.submissionId,
        respondentId: submission.respondentId,
        formId: submission.formId,
        formName: submission.formName,
        createdAt: submission.createdAt,
        fields: submission.fields,
        questions: submission.questions
      },
      message: `Retrieved submission **${submission.submissionId}** from form **"${submission.formName}"** submitted at ${submission.createdAt}.`
    };
  })
  .build();
