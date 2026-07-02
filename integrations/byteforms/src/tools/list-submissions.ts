import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubmissionsTool = SlateTool.create(spec, {
  name: 'List Form Submissions',
  key: 'list_form_submissions',
  description: `Retrieve submissions (responses) for a specific ByteForms form. Supports cursor-based pagination, ordering, and search filtering. Each submission includes the response data as key-value pairs along with metadata like submission time and IP address.`,
  instructions: [
    'Use the `after` or `before` cursor values from a previous response to paginate through results.',
    'Set `order` to "desc" to get the most recent submissions first.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The ID of the form to retrieve submissions for'),
      limit: z.number().optional().describe('Maximum number of submissions to return'),
      order: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order by creation time. Defaults to ascending.'),
      query: z.string().optional().describe('Search query to filter submissions'),
      after: z
        .string()
        .optional()
        .describe(
          'Cursor for forward pagination. Use the "after" cursor from a previous response.'
        ),
      before: z
        .string()
        .optional()
        .describe(
          'Cursor for backward pagination. Use the "before" cursor from a previous response.'
        )
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of submissions matching the query'),
      cursor: z
        .object({
          after: z.string().nullable().describe('Cursor to use for fetching the next page'),
          before: z
            .string()
            .nullable()
            .describe('Cursor to use for fetching the previous page')
        })
        .describe('Pagination cursors'),
      submissions: z.array(
        z.object({
          submissionId: z.number().describe('Unique identifier of the submission'),
          formId: z.number().describe('ID of the form this submission belongs to'),
          responses: z
            .record(z.string(), z.any())
            .describe('Submission data as key-value pairs'),
          ip: z.string().optional().describe('IP address of the submitter'),
          createdAt: z.string().describe('ISO timestamp when the submission was created'),
          updatedAt: z.string().describe('ISO timestamp when the submission was last updated')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listFormResponses(ctx.input.formId, {
      limit: ctx.input.limit,
      order: ctx.input.order,
      query: ctx.input.query,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let submissions = result.data.map(item => ({
      submissionId: item.id,
      formId: item.form_id,
      responses: item.response,
      ip: item.options?.ip as string | undefined,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));

    return {
      output: {
        totalCount: result.count,
        cursor: result.cursor,
        submissions
      },
      message: `Retrieved **${submissions.length}** submission(s) (total: ${result.count}) for form ${ctx.input.formId}.`
    };
  })
  .build();
