import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let surveyResponseTrigger = SlateTrigger.create(spec, {
  name: 'Survey Response',
  key: 'survey_response',
  description:
    'Triggers when a user interacts with a survey: answers the first question, completes all questions, or dismisses the survey.'
})
  .input(
    z.object({
      event: z
        .enum(['answered', 'completed', 'dismissed'])
        .describe('Type of survey interaction'),
      responseId: z.string().describe('Unique identifier of the response'),
      rating: z.number().optional().describe('Numeric rating (0-10 scale)'),
      feedback: z.string().optional().describe('Textual feedback from the user'),
      answers: z.array(z.any()).optional().describe('Array of answer objects'),
      category: z
        .string()
        .optional()
        .describe('Response category (promoter, passive, detractor)'),
      surveyCompleted: z
        .boolean()
        .optional()
        .describe('Whether the survey was fully completed'),
      created: z.string().optional().describe('Timestamp of the response'),
      method: z.string().optional().describe('Survey delivery method'),
      referrer: z.string().optional().describe('URL where the survey was shown'),
      projectId: z.string().optional().describe('Project ID'),
      userName: z.string().optional().describe('Respondent name'),
      userEmail: z.string().optional().describe('Respondent email'),
      userId: z.string().optional().describe('Respondent user ID'),
      userTraits: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Respondent custom traits'),
      location: z
        .object({
          country: z.string().optional(),
          city: z.string().optional()
        })
        .optional()
        .describe('Respondent location')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('Unique identifier of the response'),
      event: z
        .string()
        .describe('Type of survey interaction (answered, completed, dismissed)'),
      rating: z.number().optional().describe('Numeric rating (0-10 scale)'),
      feedback: z.string().optional().describe('Textual feedback from the user'),
      answers: z.array(z.any()).optional().describe('Array of answer objects'),
      category: z
        .string()
        .optional()
        .describe('Response category (promoter, passive, detractor)'),
      surveyCompleted: z
        .boolean()
        .optional()
        .describe('Whether the survey was fully completed'),
      created: z.string().optional().describe('Timestamp of the response'),
      method: z.string().optional().describe('Survey delivery method'),
      referrer: z.string().optional().describe('URL where the survey was shown'),
      projectId: z.string().optional().describe('Project ID'),
      userName: z.string().optional().describe('Respondent name'),
      userEmail: z.string().optional().describe('Respondent email'),
      userId: z.string().optional().describe('Respondent user ID'),
      userTraits: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Respondent custom traits'),
      country: z.string().optional().describe('Respondent country'),
      city: z.string().optional().describe('Respondent city')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let response = data.response || {};
      let user = response.user || {};
      let location = response.location || {};

      return {
        inputs: [
          {
            event: data.event,
            responseId: response.id || '',
            rating: response.rating,
            feedback: response.feedback,
            answers: response.answers,
            category: response.category,
            surveyCompleted: response.completed,
            created: response.created,
            method: response.method,
            referrer: response.referrer,
            projectId: response.project,
            userName: user.name,
            userEmail: user.email,
            userId: user.userId,
            userTraits: user.traits,
            location: {
              country: location.country,
              city: location.city
            }
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `response.${ctx.input.event}`,
        id: ctx.input.responseId,
        output: {
          responseId: ctx.input.responseId,
          event: ctx.input.event,
          rating: ctx.input.rating,
          feedback: ctx.input.feedback,
          answers: ctx.input.answers,
          category: ctx.input.category,
          surveyCompleted: ctx.input.surveyCompleted,
          created: ctx.input.created,
          method: ctx.input.method,
          referrer: ctx.input.referrer,
          projectId: ctx.input.projectId,
          userName: ctx.input.userName,
          userEmail: ctx.input.userEmail,
          userId: ctx.input.userId,
          userTraits: ctx.input.userTraits,
          country: ctx.input.location?.country,
          city: ctx.input.location?.city
        }
      };
    }
  })
  .build();
