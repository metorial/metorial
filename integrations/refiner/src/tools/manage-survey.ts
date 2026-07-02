import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let manageSurvey = SlateTool.create(spec, {
  name: 'Manage Survey',
  key: 'manage_survey',
  description: `Perform management actions on a survey: publish, unpublish, duplicate, or delete. Specify the survey UUID and the action to perform.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      surveyUuid: z.string().describe('UUID of the survey to manage'),
      action: z
        .enum(['publish', 'unpublish', 'duplicate', 'delete'])
        .describe('Action to perform on the survey'),
      duplicateName: z
        .string()
        .optional()
        .describe('Name for the duplicated survey (required when action is "duplicate")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      newSurveyUuid: z
        .string()
        .optional()
        .describe('UUID of the newly created survey (only for duplicate action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });
    let message = '';
    let newSurveyUuid: string | undefined;

    switch (ctx.input.action) {
      case 'publish': {
        await client.publishForm(ctx.input.surveyUuid, true);
        message = `Published survey **${ctx.input.surveyUuid}**.`;
        break;
      }
      case 'unpublish': {
        await client.publishForm(ctx.input.surveyUuid, false);
        message = `Unpublished survey **${ctx.input.surveyUuid}**.`;
        break;
      }
      case 'duplicate': {
        let name = ctx.input.duplicateName || 'Copy';
        let result = (await client.duplicateForm(ctx.input.surveyUuid, name)) as any;
        newSurveyUuid = result.new_form_uuid;
        message = `Duplicated survey **${ctx.input.surveyUuid}** as **"${name}"** (new UUID: ${newSurveyUuid}).`;
        break;
      }
      case 'delete': {
        await client.deleteForm(ctx.input.surveyUuid);
        message = `Deleted survey **${ctx.input.surveyUuid}**.`;
        break;
      }
    }

    return {
      output: {
        success: true,
        newSurveyUuid
      },
      message
    };
  })
  .build();
