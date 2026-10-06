import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectUnavailableDelighted, unavailableMessage } from '../lib/unavailable';
import { spec } from '../spec';

export let addSurveyResponse = SlateTool.create(spec, {
  name: 'Add Survey Response',
  key: 'add_survey_response',
  description:
    'DEPRECATED — Delighted customer access ended on July 1, 2026. This legacy tool is retained for compatibility and cannot be executed.',
  instructions: [unavailableMessage],
  tags: {
    deprecated: true,
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
  .handleInvocation(async () => rejectUnavailableDelighted())
  .build();
