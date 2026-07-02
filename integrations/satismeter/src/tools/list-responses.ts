import { SlateTool } from 'slates';
import { z } from 'zod';
import { SatisMeterClient } from '../lib/client';
import { spec } from '../spec';

export let listResponsesTool = SlateTool.create(spec, {
  name: 'List Survey Responses',
  key: 'list_responses',
  description: `Retrieve survey responses from the project, optionally filtered by a specific survey and date range. Supports cursor-based pagination. Returns response details including answers, user information, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      surveyId: z
        .string()
        .optional()
        .describe(
          'Filter responses to a specific survey. If omitted, returns responses from all surveys.'
        ),
      startDate: z
        .string()
        .optional()
        .describe(
          'Start of the date range filter in ISO 8601 format (e.g., 2024-01-01T00:00:00.000Z)'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'End of the date range filter in ISO 8601 format (e.g., 2024-12-31T23:59:59.999Z)'
        ),
      pageCursor: z
        .string()
        .optional()
        .describe(
          'Cursor for pagination. Use the nextPageCursor from a previous response to get the next page.'
        ),
      pageSize: z
        .number()
        .optional()
        .describe('Number of responses per page (1-100, default 20)')
    })
  )
  .output(
    z.object({
      responses: z
        .array(
          z.object({
            responseId: z.string().optional().describe('Unique identifier of the response'),
            rating: z.number().optional().describe('Numeric rating given by the user'),
            feedback: z.string().optional().describe('Textual feedback from the user'),
            answers: z
              .array(z.any())
              .optional()
              .describe('Array of answer objects for each survey question'),
            category: z
              .string()
              .optional()
              .describe('Response category (e.g., promoter, passive, detractor)'),
            completed: z
              .boolean()
              .optional()
              .describe('Whether the user completed all survey questions'),
            created: z.string().optional().describe('Timestamp when the response was created'),
            method: z
              .string()
              .optional()
              .describe('Survey delivery method (In-App, Mobile, Email)'),
            user: z.any().optional().describe('User information associated with the response')
          })
        )
        .describe('List of survey responses'),
      nextPageCursor: z
        .string()
        .optional()
        .describe('Cursor to fetch the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey);
    let result = await client.listResponses({
      projectId: ctx.config.projectId,
      campaignId: ctx.input.surveyId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      pageCursor: ctx.input.pageCursor,
      pageSize: ctx.input.pageSize
    });

    let responses = (result?.data || []).map((r: any) => ({
      responseId: r.id,
      rating: r.rating,
      feedback: r.feedback,
      answers: r.answers,
      category: r.category,
      completed: r.completed,
      created: r.created,
      method: r.method,
      user: r.user
    }));

    let nextPageCursor = result?.page?.nextPageCursor;

    return {
      output: { responses, nextPageCursor },
      message: `Retrieved **${responses.length}** response(s).${nextPageCursor ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
