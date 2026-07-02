import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubmissionsTool = SlateTool.create(spec, {
  name: 'List Submissions',
  key: 'list_submissions',
  description: `List form submissions. Can retrieve submissions for a specific form or across all forms in the account. Supports filtering, sorting, and pagination.`,
  instructions: [
    'Provide a formId to list submissions for a specific form, or omit it to list submissions across all forms.',
    'Use filter to narrow results (e.g., {"created_at:gt": "2024-01-01"} for date filtering, {"status": "ACTIVE"} for status filtering).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z
        .string()
        .optional()
        .describe(
          'Form ID to list submissions for. If omitted, returns submissions across all forms.'
        ),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Filter object for narrowing results. Supports field-based filtering with operators like :gt, :lt, etc.'
        ),
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., "created_at", "updated_at")'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      limit: z
        .number()
        .optional()
        .describe('Max number of submissions to return (default 20, max 1000)'),
      offset: z.number().optional().describe('Number of submissions to skip for pagination')
    })
  )
  .output(
    z.object({
      submissions: z.array(
        z.object({
          submissionId: z.string().describe('Unique submission identifier'),
          formId: z.string().describe('ID of the form this submission belongs to'),
          createdAt: z.string().describe('Submission creation date'),
          updatedAt: z.string().describe('Last update date'),
          status: z.string().describe('Submission status (ACTIVE, DELETED, etc.)'),
          ip: z.string().optional().describe('IP address of the submitter'),
          answers: z
            .record(z.string(), z.any())
            .describe('Map of question IDs to answer objects')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let params = {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderby: ctx.input.sortBy,
      direction: ctx.input.sortDirection,
      filter: ctx.input.filter
    };

    let submissions = ctx.input.formId
      ? await client.listFormSubmissions(ctx.input.formId, params)
      : await client.listAllSubmissions(params);

    let mapped = (submissions || []).map((s: any) => ({
      submissionId: String(s.id),
      formId: String(s.form_id),
      createdAt: s.created_at || '',
      updatedAt: s.updated_at || '',
      status: s.status || '',
      ip: s.ip || undefined,
      answers: s.answers || {}
    }));

    return {
      output: { submissions: mapped },
      message: `Found **${mapped.length}** submission(s)${ctx.input.formId ? ` for form ${ctx.input.formId}` : ''}.`
    };
  })
  .build();
