import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSurveyResponses = SlateTool.create(spec, {
  name: 'Get Survey Responses',
  key: 'get_survey_responses',
  description: `Retrieve responses for a specific Hotjar survey. Returns response data including answers, user metadata, device information, and sentiment analysis. Responses are sorted by creation date (newest first). Supports pagination for surveys with many responses.`,
  constraints: [
    'Available on Ask Scale plans only.',
    'Responses are sorted by creation date in descending order and cannot be filtered by date.',
    'Rate limited to 3,000 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Hotjar site ID. Found on the Sites & Organizations page.'),
      surveyId: z.string().describe('ID of the survey to retrieve responses for.'),
      limit: z.number().optional().describe('Maximum number of responses to return per page.'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response to fetch the next page.')
    })
  )
  .output(
    z.object({
      responses: z
        .array(
          z.object({
            responseId: z.string().describe('Unique response identifier.'),
            hotjarUserId: z.string().describe('Hotjar user ID of the respondent.'),
            createdTime: z
              .string()
              .describe('When the response was submitted (RFC 3339 format).'),
            isComplete: z
              .boolean()
              .describe('Whether the survey response was fully completed.'),
            device: z.string().describe('Device type used (tablet, mobile, or desktop).'),
            browser: z.string().describe('Browser name.'),
            os: z.string().describe('Operating system name.'),
            country: z.string().describe('ISO 3166 country code.'),
            responseOriginUrl: z
              .string()
              .describe('URL where the survey response was submitted.'),
            recordingUrl: z
              .string()
              .nullable()
              .describe('Link to the associated Hotjar recording, if available.'),
            userAttributes: z
              .array(
                z.object({
                  name: z.string().describe('Attribute name.'),
                  value: z.string().describe('Attribute value.')
                })
              )
              .describe('Custom user attributes from the Identify API.'),
            answers: z
              .array(
                z.object({
                  questionId: z.string().describe('Question identifier.'),
                  answer: z.string().nullable().describe('The answer text.'),
                  comment: z.string().nullable().describe('Optional comment on the answer.'),
                  tags: z
                    .array(
                      z.object({
                        name: z.string().describe('Tag name.')
                      })
                    )
                    .describe('Tags applied to the response.'),
                  sentiment: z
                    .string()
                    .nullable()
                    .describe(
                      'Sentiment of the answer: "positive", "negative", "neutral", or null.'
                    )
                })
              )
              .describe('Answers to each survey question.')
          })
        )
        .describe('List of survey responses.'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for the next page of results, null if no more results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSurveyResponses(ctx.input.siteId, ctx.input.surveyId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let responses = result.results.map(r => ({
      responseId: r.id,
      hotjarUserId: r.hotjar_user_id,
      createdTime: r.created_time,
      isComplete: r.is_complete,
      device: r.device,
      browser: r.browser,
      os: r.os,
      country: r.country,
      responseOriginUrl: r.response_origin_url,
      recordingUrl: r.recording_url,
      userAttributes: r.user_attributes || [],
      answers: r.answers.map(a => ({
        questionId: a.question_id,
        answer: a.answer,
        comment: a.comment,
        tags: a.tags || [],
        sentiment: a.sentiment
      }))
    }));

    return {
      output: {
        responses,
        nextCursor: result.next_cursor
      },
      message: `Retrieved **${responses.length}** response(s) for survey ${ctx.input.surveyId}.${result.next_cursor ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
