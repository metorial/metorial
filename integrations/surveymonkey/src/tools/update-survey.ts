import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSurvey = SlateTool.create(spec, {
  name: 'Update Survey',
  key: 'update_survey',
  description: `Update properties of an existing survey such as its title, nickname, language, or folder assignment. Only provided fields will be modified.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey to update'),
      title: z.string().optional().describe('New survey title'),
      nickname: z.string().optional().describe('New internal nickname'),
      language: z.string().optional().describe('New language code'),
      folderId: z.string().optional().describe('New folder ID')
    })
  )
  .output(
    z.object({
      surveyId: z.string(),
      title: z.string(),
      dateModified: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let survey = await client.updateSurvey(ctx.input.surveyId, {
      title: ctx.input.title,
      nickname: ctx.input.nickname,
      language: ctx.input.language,
      folderId: ctx.input.folderId
    });

    return {
      output: {
        surveyId: survey.id,
        title: survey.title,
        dateModified: survey.date_modified
      },
      message: `Updated survey **"${survey.title}"**.`
    };
  })
  .build();
