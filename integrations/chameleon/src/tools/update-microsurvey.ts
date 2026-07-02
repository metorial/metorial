import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let updateMicrosurvey = SlateTool.create(spec, {
  name: 'Update Microsurvey',
  key: 'update_microsurvey',
  description: `Update a Chameleon microsurvey's settings. You can publish/unpublish, add/remove environments, and manage tags.
To add an environment or tag, prefix the ID with "+". To remove, prefix with "-".`
})
  .input(
    z.object({
      surveyId: z.string().describe('Chameleon microsurvey ID to update'),
      publishedAt: z
        .string()
        .nullable()
        .optional()
        .describe('ISO8601 timestamp to publish, or null to unpublish'),
      urlGroupId: z
        .string()
        .optional()
        .describe('Environment ID with "+" prefix to add or "-" prefix to remove'),
      tagId: z
        .string()
        .optional()
        .describe('Tag ID with "+" prefix to add or "-" prefix to remove')
    })
  )
  .output(
    z.object({
      surveyId: z.string().describe('ID of the updated microsurvey'),
      name: z.string().optional().describe('Name of the updated microsurvey'),
      publishedAt: z.string().nullable().optional().describe('Publication timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);
    let result = await client.updateSurvey(ctx.input.surveyId, {
      publishedAt: ctx.input.publishedAt,
      urlGroupId: ctx.input.urlGroupId,
      tagId: ctx.input.tagId
    });
    return {
      output: {
        surveyId: result.id,
        name: result.name,
        publishedAt: result.published_at
      },
      message: `Microsurvey **${result.name || result.id}** has been updated.`
    };
  })
  .build();
