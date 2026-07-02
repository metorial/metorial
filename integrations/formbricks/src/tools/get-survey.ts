import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSurvey = SlateTool.create(spec, {
  name: 'Get Survey',
  key: 'get_survey',
  description: `Retrieve full details of a specific survey by ID. Returns the complete survey configuration including all questions, endings, welcome card, display settings, and languages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey to retrieve')
    })
  )
  .output(
    z.object({
      surveyId: z.string().describe('Unique survey identifier'),
      name: z.string().describe('Survey name'),
      status: z.string().describe('Survey status'),
      type: z.string().describe('Survey type (link or app)'),
      environmentId: z.string().describe('Environment the survey belongs to'),
      questions: z
        .array(z.any())
        .describe('Array of survey questions with their configuration'),
      endings: z.array(z.any()).optional().describe('End screen configurations'),
      welcomeCard: z.any().optional().describe('Welcome card configuration'),
      hiddenFields: z.any().optional().describe('Hidden fields configuration'),
      displayOption: z.string().optional().describe('Display option setting'),
      languages: z.array(z.any()).optional().describe('Language configurations'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let survey = await client.getSurvey(ctx.input.surveyId);

    return {
      output: {
        surveyId: survey.id,
        name: survey.name ?? '',
        status: survey.status ?? '',
        type: survey.type ?? '',
        environmentId: survey.environmentId ?? '',
        questions: survey.questions ?? [],
        endings: survey.endings,
        welcomeCard: survey.welcomeCard,
        hiddenFields: survey.hiddenFields,
        displayOption: survey.displayOption,
        languages: survey.languages,
        createdAt: survey.createdAt ?? '',
        updatedAt: survey.updatedAt ?? ''
      },
      message: `Retrieved survey **${survey.name}** (${survey.status}).`
    };
  })
  .build();
