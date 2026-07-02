import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSurveys = SlateTool.create(spec, {
  name: 'List Surveys',
  key: 'list_surveys',
  description: `List surveys for a Hotjar site. Returns survey metadata including name, type, status, and optionally the survey questions. Supports pagination for sites with many surveys.`,
  constraints: [
    'Available on Ask Scale plans only.',
    'Rate limited to 3,000 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Hotjar site ID. Found on the Sites & Organizations page.'),
      withQuestions: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include question details in the response.'),
      limit: z.number().optional().describe('Maximum number of surveys to return per page.'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response to fetch the next page.')
    })
  )
  .output(
    z.object({
      surveys: z
        .array(
          z.object({
            surveyId: z.string().describe('Unique survey identifier.'),
            name: z.string().describe('Survey name.'),
            type: z.string().describe('Survey type (e.g., "popover").'),
            url: z.string().describe('Survey URL.'),
            responsesUrl: z.string().describe('URL to access survey responses.'),
            isEnabled: z.boolean().describe('Whether the survey is currently active.'),
            createdTime: z.string().describe('When the survey was created.'),
            updatedTime: z.string().optional().describe('When the survey was last updated.'),
            sentimentAnalysisEnabled: z
              .boolean()
              .describe('Whether sentiment analysis is enabled.'),
            questions: z
              .array(
                z.object({
                  questionId: z.string().describe('Unique question identifier.'),
                  type: z
                    .string()
                    .describe('Question type (e.g., "nps", "short-text", "radio", etc.).'),
                  text: z.string().describe('Question text.'),
                  isRequired: z.boolean().describe('Whether the question requires an answer.')
                })
              )
              .optional()
              .describe('Survey questions, included when withQuestions is true.')
          })
        )
        .describe('List of surveys.'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for the next page of results, null if no more results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      expiresAt: ctx.auth.expiresAt
    });

    let result = await client.listSurveys(ctx.input.siteId, {
      withQuestions: ctx.input.withQuestions,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let surveys = result.results.map(survey => ({
      surveyId: survey.id,
      name: survey.name,
      type: survey.type,
      url: survey.url,
      responsesUrl: survey.responses_url,
      isEnabled: survey.is_enabled,
      createdTime: survey.created_time,
      updatedTime: survey.updated_time,
      sentimentAnalysisEnabled: survey.sentiment_analysis_enabled,
      questions: survey.questions?.map(q => ({
        questionId: q.id,
        type: q.type,
        text: q.text,
        isRequired: q.is_required
      }))
    }));

    return {
      output: {
        surveys,
        nextCursor: result.next_cursor
      },
      message: `Found **${surveys.length}** survey(s) for site ${ctx.input.siteId}.${result.next_cursor ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
