import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let updateExperience = SlateTool.create(spec, {
  name: 'Update Experience',
  key: 'update_experience',
  description: `Update a Chameleon tooltip or launcher. Publish/unpublish, add/remove environment associations, and manage tags.
For tours and microsurveys, use the dedicated update tools instead.`,
  instructions: [
    'To publish, set publishedAt to the current ISO8601 timestamp.',
    'To unpublish, set publishedAt to null.',
    'Prefix environment/tag IDs with "+" to add or "-" to remove.'
  ]
})
  .input(
    z.object({
      experienceType: z.enum(['tooltip', 'launcher']).describe('Type of experience to update'),
      experienceId: z.string().describe('Experience ID to update'),
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
      experienceId: z.string().describe('ID of the updated experience'),
      name: z.string().optional().describe('Name of the updated experience'),
      publishedAt: z.string().nullable().optional().describe('Publication timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);
    let updateData = {
      publishedAt: ctx.input.publishedAt,
      urlGroupId: ctx.input.urlGroupId,
      tagId: ctx.input.tagId
    };

    let result =
      ctx.input.experienceType === 'tooltip'
        ? await client.updateTooltip(ctx.input.experienceId, updateData)
        : await client.updateLauncher(ctx.input.experienceId, updateData);

    return {
      output: {
        experienceId: result.id,
        name: result.name,
        publishedAt: result.published_at
      },
      message: `${ctx.input.experienceType} **${result.name || result.id}** has been updated.`
    };
  })
  .build();
