import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleFormsClient } from '../lib/client';
import { googleFormsActionScopes } from '../scopes';
import { spec } from '../spec';

let responseAnswerSchema = z.object({
  questionId: z.string().optional().describe('ID of the question'),
  textAnswers: z.array(z.string()).optional().describe('Text answer values'),
  fileUploadAnswers: z
    .array(
      z.object({
        fileId: z.string().optional().describe('Google Drive file ID'),
        fileName: z.string().optional().describe('Name of the uploaded file'),
        mimeType: z.string().optional().describe('MIME type of the uploaded file')
      })
    )
    .optional()
    .describe('File upload answer values'),
  grade: z
    .object({
      score: z.number().optional().describe('Score awarded'),
      correct: z.boolean().optional().describe('Whether the answer was correct')
    })
    .optional()
    .describe('Grade for this answer (quiz forms only)')
});

let responseSummarySchema = z.object({
  responseId: z.string().describe('Unique identifier of the response'),
  createTime: z.string().optional().describe('Timestamp of first submission (ISO 8601)'),
  lastSubmittedTime: z
    .string()
    .optional()
    .describe('Timestamp of most recent submission (ISO 8601)'),
  respondentEmail: z.string().optional().describe('Email of the respondent, if collected'),
  totalScore: z.number().optional().describe('Total score (quiz forms only)'),
  answers: z.array(responseAnswerSchema).optional().describe('All answers in the response')
});

export let listResponses = SlateTool.create(spec, {
  name: 'List Responses',
  key: 'list_responses',
  description: `Lists all responses for a Google Form, with optional filtering by submission timestamp. Returns each response with its answers, timestamps, respondent email, and quiz grades.

Supports pagination and timestamp filtering to retrieve only recent submissions.`,
  instructions: [
    'Use the submittedAfter parameter to fetch only responses submitted after a specific time (ISO 8601 format, e.g., "2024-01-01T00:00:00Z").',
    'Results are paginated. Use pageToken from the response to retrieve additional pages.'
  ],
  constraints: [
    'Maximum page size is 5000 responses.',
    'Responses are read-only through the API.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleFormsActionScopes.listResponses)
  .input(
    z.object({
      formId: z.string().describe('The ID of the Google Form'),
      submittedAfter: z
        .string()
        .optional()
        .describe(
          'Only return responses submitted after this timestamp (ISO 8601 format, e.g. "2024-01-01T00:00:00Z")'
        ),
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of responses to return per page (max 5000)'),
      pageToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of results')
    })
  )
  .output(
    z.object({
      responses: z.array(responseSummarySchema).describe('List of form responses'),
      totalCount: z.number().describe('Number of responses returned in this page'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token to use for retrieving the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleFormsClient(ctx.auth.token);

    let filter: string | undefined;
    if (ctx.input.submittedAfter) {
      filter = `timestamp > ${ctx.input.submittedAfter}`;
    }

    let result = await client.listResponses(ctx.input.formId, {
      filter,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let responses = (result.responses || []).map(r => {
      let answers = r.answers
        ? Object.entries(r.answers).map(([questionId, answer]) => ({
            questionId,
            textAnswers: answer.textAnswers?.answers?.map(a => a.value || '') || undefined,
            fileUploadAnswers:
              answer.fileUploadAnswers?.answers?.map(a => ({
                fileId: a.fileId,
                fileName: a.fileName,
                mimeType: a.mimeType
              })) || undefined,
            grade: answer.grade
              ? {
                  score: answer.grade.score,
                  correct: answer.grade.correct
                }
              : undefined
          }))
        : undefined;

      return {
        responseId: r.responseId || '',
        createTime: r.createTime,
        lastSubmittedTime: r.lastSubmittedTime,
        respondentEmail: r.respondentEmail,
        totalScore: r.totalScore,
        answers
      };
    });

    return {
      output: {
        responses,
        totalCount: responses.length,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${responses.length} response(s) for form \`${ctx.input.formId}\`.${result.nextPageToken ? ' More responses available (use nextPageToken to load next page).' : ''}${ctx.input.submittedAfter ? ` Filtered to responses after ${ctx.input.submittedAfter}.` : ''}`
    };
  })
  .build();
