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

let submissionSchema = z.object({
  submissionId: z.string().describe('Unique submission identifier'),
  respondentId: z.string().describe('Unique respondent identifier'),
  formId: z.string().describe('Form this submission belongs to'),
  formName: z.string().describe('Name of the form'),
  createdAt: z.string().describe('ISO 8601 submission timestamp'),
  fields: z.array(fieldSchema).describe('Submitted field values')
});

export let listSubmissions = SlateTool.create(spec, {
  name: 'List Submissions',
  key: 'list_submissions',
  description: `List submissions for a specific Tally form with filtering and pagination. Use this to retrieve form responses, filter by date range, or paginate through large sets of submissions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The form ID to retrieve submissions for'),
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of submissions per page'),
      startDate: z.string().optional().describe('Filter submissions after this ISO 8601 date'),
      endDate: z.string().optional().describe('Filter submissions before this ISO 8601 date'),
      afterId: z
        .string()
        .optional()
        .describe('Return submissions after this submission ID (cursor-based pagination)')
    })
  )
  .output(
    z.object({
      page: z.number().describe('Current page number'),
      limit: z.number().describe('Number of items per page'),
      hasMore: z.boolean().describe('Whether more pages are available'),
      totalSubmissions: z.number().describe('Total number of submissions matching the filter'),
      questions: z
        .array(
          z.object({
            key: z.string().describe('Question key'),
            label: z.string().describe('Question label'),
            type: z.string().describe('Question type')
          })
        )
        .describe('Form questions for context'),
      submissions: z.array(submissionSchema).describe('List of submissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSubmissions(ctx.input.formId, {
      page: ctx.input.page,
      limit: ctx.input.limit,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      afterId: ctx.input.afterId
    });

    return {
      output: {
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
        totalSubmissions: result.totalNumberOfSubmissionsPerFilter,
        questions: result.questions,
        submissions: result.items
      },
      message: `Found **${result.items.length}** submission(s) on page ${result.page} (${result.totalNumberOfSubmissionsPerFilter} total). ${result.hasMore ? 'More pages available.' : 'No more pages.'}`
    };
  })
  .build();
