import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSurvey = SlateTool.create(spec, {
  name: 'Get Survey',
  key: 'get_survey',
  description: `Retrieve metadata and question details for a specific Hotjar survey. Use this when you already know the survey ID and need the current survey configuration before exporting responses.`,
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
      surveyId: z.string().describe('ID of the survey to retrieve.')
    })
  )
  .output(
    z.object({
      survey: z
        .object({
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
            .describe('Survey questions, when returned by Hotjar.')
        })
        .describe('Survey metadata and question details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      expiresAt: ctx.auth.expiresAt
    });

    let survey = await client.getSurvey(ctx.input.siteId, ctx.input.surveyId);

    return {
      output: {
        survey: {
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
        }
      },
      message: `Retrieved survey **${survey.name}** (${survey.id}).`
    };
  })
  .build();
