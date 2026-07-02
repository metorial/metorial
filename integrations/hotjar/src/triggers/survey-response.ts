import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let webhookQuestionSchema = z.object({
  questionId: z.number().describe('Unique question identifier.'),
  questionType: z
    .string()
    .describe(
      'Type of question (e.g., "nps", "short-text", "reaction", "single-option", "multiple-option", "email", "1-5-rating", "1-7-rating", "long-text").'
    ),
  answers: z.array(z.any()).describe('Answers to the question.')
});

let surveyResponseInputSchema = z.object({
  event: z.string().describe('Event type.'),
  version: z.number().describe('Webhook payload version.'),
  responseId: z.string().describe('Unique survey response identifier.'),
  surveyId: z.string().optional().describe('Survey identifier.'),
  surveyName: z.string().optional().describe('Survey name.'),
  siteId: z.string().optional().describe('Site identifier.'),
  device: z.string().nullable().describe('Device type: tablet, mobile, or desktop.'),
  browser: z.string().nullable().describe('Browser name.'),
  os: z.string().nullable().describe('Operating system name.'),
  countryCode: z.string().nullable().describe('ISO 3166 country code.'),
  countryName: z.string().nullable().describe('Country name.'),
  hotjarUserId: z.string().nullable().describe('Hotjar User ID (UUID).'),
  createdStr: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp of when the response was created.'),
  createdTimestamp: z
    .number()
    .nullable()
    .describe('UNIX timestamp of when the response was created.'),
  isComplete: z.boolean().nullable().describe('Whether the survey response is completed.'),
  recordingUrl: z.string().nullable().describe('Link to the associated Hotjar recording.'),
  responseOriginUrl: z.string().nullable().describe('URL where the survey was submitted.'),
  windowWidth: z.number().nullable().describe("Width of the user's window."),
  windowHeight: z.number().nullable().describe("Height of the user's window."),
  userAttributes: z.any().nullable().describe('User attributes from the Identify API.'),
  questions: z.array(webhookQuestionSchema).nullable().describe('Questions and answers.')
});

export let surveyResponseTrigger = SlateTrigger.create(spec, {
  name: 'Survey Response',
  key: 'survey_response',
  description:
    'Triggered when a new survey response is submitted on your site. Webhooks must be configured in the Hotjar dashboard on the specific survey. Available on Ask Scale plans.'
})
  .input(surveyResponseInputSchema)
  .output(
    z.object({
      responseId: z.string().describe('Unique survey response identifier.'),
      surveyId: z.string().nullable().describe('Survey identifier.'),
      surveyName: z.string().nullable().describe('Survey name.'),
      siteId: z.string().nullable().describe('Site identifier.'),
      hotjarUserId: z.string().nullable().describe('Hotjar User ID (UUID).'),
      device: z.string().nullable().describe('Device type: tablet, mobile, or desktop.'),
      browser: z.string().nullable().describe('Browser name.'),
      os: z.string().nullable().describe('Operating system name.'),
      countryCode: z.string().nullable().describe('ISO 3166 country code.'),
      countryName: z.string().nullable().describe('Country name.'),
      createdAt: z
        .string()
        .nullable()
        .describe('ISO 8601 timestamp of when the response was created.'),
      isComplete: z
        .boolean()
        .nullable()
        .describe('Whether the survey response was fully completed.'),
      responseOriginUrl: z.string().nullable().describe('URL where the survey was submitted.'),
      recordingUrl: z.string().nullable().describe('Link to the associated Hotjar recording.'),
      windowWidth: z.number().nullable().describe("Width of the user's browser window."),
      windowHeight: z.number().nullable().describe("Height of the user's browser window."),
      userAttributes: z.any().nullable().describe('User attributes from the Identify API.'),
      questions: z
        .array(
          z.object({
            questionId: z.number().describe('Unique question identifier.'),
            questionType: z.string().describe('Type of question.'),
            answers: z.array(z.any()).describe('Answers to the question.')
          })
        )
        .nullable()
        .describe('Questions and answers from the survey.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.event === 'test_message') {
        return { inputs: [] };
      }

      if (body.event !== 'survey_response') {
        return { inputs: [] };
      }

      let data = body.data || {};

      let responseId = data.id || data.api_id || `sr_${data.created_timestamp || Date.now()}`;

      return {
        inputs: [
          {
            event: body.event,
            version: body.version || 1,
            responseId: String(responseId),
            surveyId: data.survey_id ? String(data.survey_id) : undefined,
            surveyName: data.survey_name || undefined,
            siteId: data.site_id ? String(data.site_id) : undefined,
            device: data.device || null,
            browser: data.browser || null,
            os: data.os || null,
            countryCode: data.country_code || null,
            countryName: data.country_name || null,
            hotjarUserId: data.hotjar_user_id || null,
            createdStr: data.created_str || null,
            createdTimestamp: data.created_timestamp || null,
            isComplete: data.is_complete ?? null,
            recordingUrl: data.recording_url || null,
            responseOriginUrl: data.response_origin_url || null,
            windowWidth: data.window_width ?? null,
            windowHeight: data.window_height ?? null,
            userAttributes: data.user_attributes || null,
            questions: data.questions
              ? data.questions.map((q: any) => ({
                  questionId: q.question_id,
                  questionType: q.question_type,
                  answers: q.answers || []
                }))
              : null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'survey_response.created',
        id: ctx.input.responseId,
        output: {
          responseId: ctx.input.responseId,
          surveyId: ctx.input.surveyId || null,
          surveyName: ctx.input.surveyName || null,
          siteId: ctx.input.siteId || null,
          hotjarUserId: ctx.input.hotjarUserId,
          device: ctx.input.device,
          browser: ctx.input.browser,
          os: ctx.input.os,
          countryCode: ctx.input.countryCode,
          countryName: ctx.input.countryName,
          createdAt: ctx.input.createdStr,
          isComplete: ctx.input.isComplete,
          responseOriginUrl: ctx.input.responseOriginUrl,
          recordingUrl: ctx.input.recordingUrl,
          windowWidth: ctx.input.windowWidth,
          windowHeight: ctx.input.windowHeight,
          userAttributes: ctx.input.userAttributes,
          questions: ctx.input.questions
        }
      };
    }
  })
  .build();
