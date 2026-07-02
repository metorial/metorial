import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSurvey = SlateTool.create(spec, {
  name: 'Create Survey',
  key: 'create_survey',
  description: `Create a new survey. You can create a blank survey, copy from an existing survey, or use a template. Provide a title and optional settings like language and folder assignment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Survey title (defaults to "New Survey")'),
      fromTemplateId: z.string().optional().describe('Template ID to create survey from'),
      fromSurveyId: z.string().optional().describe('Existing survey ID to copy from'),
      nickname: z.string().optional().describe('Internal nickname for the survey'),
      language: z.string().optional().describe('Survey language code (e.g. "en", "es", "fr")'),
      folderId: z.string().optional().describe('Folder ID to place the survey in')
    })
  )
  .output(
    z.object({
      surveyId: z.string(),
      title: z.string(),
      previewUrl: z.string().optional(),
      editUrl: z.string().optional(),
      collectUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let survey = await client.createSurvey({
      title: ctx.input.title,
      fromTemplateId: ctx.input.fromTemplateId,
      fromSurveyId: ctx.input.fromSurveyId,
      nickname: ctx.input.nickname,
      language: ctx.input.language,
      folderId: ctx.input.folderId
    });

    return {
      output: {
        surveyId: survey.id,
        title: survey.title,
        previewUrl: survey.preview,
        editUrl: survey.edit_url,
        collectUrl: survey.collect_url
      },
      message: `Created survey **"${survey.title}"** with ID \`${survey.id}\`.`
    };
  })
  .build();
