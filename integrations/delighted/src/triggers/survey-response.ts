import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let surveyResponseTrigger = SlateTrigger.create(spec, {
  name: 'Survey Response',
  key: 'survey_response',
  description:
    'Triggers when a survey response is received or updated, including score selection, comment addition, and additional question answers.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (survey_response.created or survey_response.updated)'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      responseId: z.string().describe('ID of the survey response'),
      personId: z.string().describe('ID of the person'),
      personEmail: z.string().nullable().describe('Email of the person'),
      personName: z.string().nullable().describe('Name of the person'),
      surveyType: z.string().describe('Type of survey'),
      score: z.number().describe('Response score'),
      comment: z.string().nullable().describe('Comment text'),
      permalink: z.string().nullable().describe('Link to view the response'),
      createdAt: z.number().describe('Unix timestamp of creation'),
      updatedAt: z.number().describe('Unix timestamp of last update'),
      personProperties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom properties'),
      tags: z.array(z.string()).optional().describe('Response tags'),
      additionalAnswers: z.array(z.any()).optional().describe('Additional question answers')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('ID of the survey response'),
      personId: z.string().describe('ID of the person'),
      personEmail: z.string().nullable().describe('Email of the person'),
      personName: z.string().nullable().describe('Name of the person'),
      surveyType: z
        .string()
        .describe('Type of survey (nps, csat, ces, pmf, enps, smileys, stars, thumbs)'),
      score: z.number().describe('Response score'),
      comment: z.string().nullable().describe('Comment text'),
      permalink: z.string().nullable().describe('Link to view the response in Delighted'),
      createdAt: z.number().describe('Unix timestamp when response was created'),
      updatedAt: z.number().describe('Unix timestamp when response was last updated'),
      personProperties: z.record(z.string(), z.string()).describe('Custom person properties'),
      tags: z.array(z.string()).describe('Tags applied to the response'),
      additionalAnswers: z.array(z.any()).describe('Answers to additional questions')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event_type;
      let eventId = body.event_id;
      let eventData = body.event_data;

      if (!eventType || !eventData) {
        return { inputs: [] };
      }

      if (!eventType.startsWith('survey_response.')) {
        return { inputs: [] };
      }

      let person = eventData.person || {};

      return {
        inputs: [
          {
            eventType,
            eventId,
            responseId: String(eventData.id),
            personId: String(person.id || ''),
            personEmail: person.email || null,
            personName: person.name || null,
            surveyType: eventData.survey_type || '',
            score: eventData.score,
            comment: eventData.comment || null,
            permalink: eventData.permalink || null,
            createdAt: eventData.created_at,
            updatedAt: eventData.updated_at,
            personProperties: eventData.person_properties || {},
            tags: eventData.tags || [],
            additionalAnswers: eventData.additional_answers || []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          responseId: ctx.input.responseId,
          personId: ctx.input.personId,
          personEmail: ctx.input.personEmail,
          personName: ctx.input.personName,
          surveyType: ctx.input.surveyType,
          score: ctx.input.score,
          comment: ctx.input.comment,
          permalink: ctx.input.permalink,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          personProperties: ctx.input.personProperties || {},
          tags: ctx.input.tags || [],
          additionalAnswers: ctx.input.additionalAnswers || []
        }
      };
    }
  })
  .build();
