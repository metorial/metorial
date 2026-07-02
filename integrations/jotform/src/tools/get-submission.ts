import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubmissionTool = SlateTool.create(spec, {
  name: 'Get Submission',
  key: 'get_submission',
  description: `Retrieve a single form submission by its ID. Returns complete submission data including all field answers, metadata, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      submissionId: z.string().describe('The ID of the submission to retrieve')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique submission identifier'),
      formId: z.string().describe('ID of the form this submission belongs to'),
      createdAt: z.string().describe('Submission creation date'),
      updatedAt: z.string().describe('Last update date'),
      status: z.string().describe('Submission status'),
      ip: z.string().optional().describe('IP address of the submitter'),
      answers: z.record(z.string(), z.any()).describe('Map of question IDs to answer objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let submission = await client.getSubmission(ctx.input.submissionId);

    return {
      output: {
        submissionId: String(submission.id),
        formId: String(submission.form_id),
        createdAt: submission.created_at || '',
        updatedAt: submission.updated_at || '',
        status: submission.status || '',
        ip: submission.ip || undefined,
        answers: submission.answers || {}
      },
      message: `Retrieved submission **${submission.id}** from form ${submission.form_id}.`
    };
  })
  .build();
