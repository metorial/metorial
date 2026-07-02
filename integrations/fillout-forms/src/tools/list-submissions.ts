import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { submissionSchema } from '../lib/types';
import { spec } from '../spec';

export let listSubmissions = SlateTool.create(spec, {
  name: 'List Submissions',
  key: 'list_submissions',
  description: `Retrieve submissions for a specific form with powerful filtering options. Supports filtering by date range, submission status, text search, pagination, and sort order. Can also include edit links and preview responses.`,
  instructions: [
    'Dates must be in ISO 8601 format (e.g. 2024-05-16T23:20:05.324Z).',
    'Maximum of 150 submissions per request. Use offset for pagination.'
  ],
  constraints: ['In-progress submissions are only available on the Business plan.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('Public identifier of the form'),
      limit: z
        .number()
        .min(1)
        .max(150)
        .optional()
        .describe('Max submissions per request (1-150, default 50)'),
      offset: z.number().optional().describe('Starting position for pagination (default 0)'),
      afterDate: z.string().optional().describe('Filter submissions after this ISO 8601 date'),
      beforeDate: z
        .string()
        .optional()
        .describe('Filter submissions before this ISO 8601 date'),
      status: z
        .enum(['finished', 'in_progress'])
        .optional()
        .describe('Submission status filter (default: finished)'),
      sort: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order by submission time (default: asc)'),
      search: z.string().optional().describe('Text search filter across submissions'),
      includeEditLink: z
        .boolean()
        .optional()
        .describe('Include an edit link for each submission'),
      includePreview: z.boolean().optional().describe('Include preview responses')
    })
  )
  .output(
    z.object({
      responses: z.array(submissionSchema).describe('Array of submission objects'),
      totalResponses: z.number().describe('Total number of matching submissions'),
      pageCount: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl || ctx.config.baseUrl
    });

    let { formId, ...params } = ctx.input;
    let result = await client.listSubmissions(formId, params);

    return {
      output: result,
      message: `Retrieved **${result.responses.length}** of **${result.totalResponses}** total submission(s) for form \`${formId}\` (page ${Math.floor((ctx.input.offset ?? 0) / (ctx.input.limit ?? 50)) + 1} of ${result.pageCount}).`
    };
  })
  .build();
