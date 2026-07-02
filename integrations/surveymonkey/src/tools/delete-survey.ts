import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSurvey = SlateTool.create(spec, {
  name: 'Delete Survey',
  key: 'delete_survey',
  description: `Permanently delete a survey and all its associated data including responses, collectors, and pages.`,
  constraints: [
    'This action is irreversible. All survey data, responses, and collectors will be permanently removed.'
  ],
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
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    await client.deleteSurvey(ctx.input.surveyId);

    return {
      output: { deleted: true },
      message: `Deleted survey \`${ctx.input.surveyId}\`.`
    };
  })
  .build();
