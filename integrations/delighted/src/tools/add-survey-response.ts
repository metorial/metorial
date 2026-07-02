import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addSurveyResponse = SlateTool.create(spec, {
  name: 'Add Survey Response',
  key: 'add_survey_response',
  description: `Programmatically add a survey response for a person. Useful for importing responses collected outside of Delighted.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.string().describe('ID of the person to add the response for'),
      score: z.number().describe('Response score (e.g., 0-10 for NPS, 1-5 for CSAT)'),
      comment: z.string().optional().describe('Optional text feedback from the respondent'),
      personProperties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom properties to associate with the response'),
      createdAt: z
        .number()
        .optional()
        .describe('Unix timestamp of when the response was collected. Defaults to now.')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('ID of the created response'),
      person: z.any().describe('Person ID or expanded person object'),
      surveyType: z.string().describe('Survey type'),
      score: z.number().describe('Response score'),
      comment: z.string().nullable().describe('Comment text'),
      permalink: z.string().nullable().describe('Link to view the response'),
      createdAt: z.number().describe('Unix timestamp of creation'),
      updatedAt: z.number().describe('Unix timestamp of last update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createSurveyResponse({
      personId: ctx.input.personId,
      score: ctx.input.score,
      comment: ctx.input.comment,
      personProperties: ctx.input.personProperties,
      createdAt: ctx.input.createdAt
    });

    return {
      output: {
        responseId: result.responseId,
        person: result.person,
        surveyType: result.surveyType,
        score: result.score,
        comment: result.comment,
        permalink: result.permalink,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Survey response added with score **${result.score}** (${result.surveyType}).`
    };
  })
  .build();
