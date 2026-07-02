import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let manageForms = SlateTool.create(spec, {
  name: 'Manage Forms',
  key: 'manage_forms',
  description: `Retrieve forms and form submissions from Connecteam. List all forms, get form details with questions, or retrieve submissions with answers. Useful for automating data collection workflows like inspections, orders, and reports.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_forms', 'get_form', 'list_submissions', 'get_submission'])
        .describe('Forms action to perform'),
      formId: z
        .number()
        .optional()
        .describe('Form ID (required for get_form, list_submissions, get_submission)'),
      formSubmissionId: z.string().optional().describe('Submission ID (for get_submission)'),
      userIds: z.array(z.number()).optional().describe('Filter submissions by user IDs'),
      submittingStartTimestamp: z
        .number()
        .optional()
        .describe('Filter submissions after this Unix timestamp'),
      submittingEndTime: z
        .number()
        .optional()
        .describe('Filter submissions before this Unix timestamp'),
      limit: z.number().optional().describe('Results per page'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { action } = ctx.input;

    if (action === 'list_forms') {
      let result = await client.getForms({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved forms.`
      };
    }

    if (action === 'get_form') {
      if (!ctx.input.formId) throw new Error('formId is required.');
      let result = await client.getForm(ctx.input.formId);
      return {
        output: { result },
        message: `Retrieved form **${ctx.input.formId}**.`
      };
    }

    if (action === 'list_submissions') {
      if (!ctx.input.formId) throw new Error('formId is required.');
      let result = await client.getFormSubmissions(ctx.input.formId, {
        userIds: ctx.input.userIds,
        submittingStartTimestamp: ctx.input.submittingStartTimestamp,
        submittingEndTime: ctx.input.submittingEndTime,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved submissions for form **${ctx.input.formId}**.`
      };
    }

    if (action === 'get_submission') {
      if (!ctx.input.formId) throw new Error('formId is required.');
      if (!ctx.input.formSubmissionId) throw new Error('formSubmissionId is required.');
      let result = await client.getFormSubmission(
        ctx.input.formId,
        ctx.input.formSubmissionId
      );
      return {
        output: { result },
        message: `Retrieved submission **${ctx.input.formSubmissionId}** for form **${ctx.input.formId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
