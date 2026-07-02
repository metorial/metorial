import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSurvey = SlateTool.create(spec, {
  name: 'Delete Survey',
  key: 'delete_survey',
  description: `Permanently delete a survey and all its associated data. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey to delete')
    })
  )
  .output(
    z.object({
      surveyId: z.string().describe('ID of the deleted survey')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteSurvey(ctx.input.surveyId);

    return {
      output: {
        surveyId: ctx.input.surveyId
      },
      message: `Deleted survey \`${ctx.input.surveyId}\`.`
    };
  })
  .build();
