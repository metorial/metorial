import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let updateTour = SlateTool.create(spec, {
  name: 'Update Tour',
  key: 'update_tour',
  description: `Update a Chameleon product tour's settings. You can publish/unpublish, add/remove environment associations, and add/remove tags.
To add an environment or tag, prefix the ID with "+". To remove, prefix with "-".`,
  instructions: [
    'To publish a tour, set publishedAt to the current ISO8601 timestamp.',
    'To unpublish a tour, set publishedAt to null.',
    'To add an environment, use "+<environment_id>" for urlGroupId.',
    'To remove an environment, use "-<environment_id>" for urlGroupId.',
    'Same +/- prefix pattern applies for tagId.'
  ]
})
  .input(
    z.object({
      tourId: z.string().describe('Chameleon tour ID to update'),
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
      tourId: z.string().describe('ID of the updated tour'),
      name: z.string().optional().describe('Name of the updated tour'),
      publishedAt: z.string().nullable().optional().describe('Publication timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);
    let result = await client.updateTour(ctx.input.tourId, {
      publishedAt: ctx.input.publishedAt,
      urlGroupId: ctx.input.urlGroupId,
      tagId: ctx.input.tagId
    });
    return {
      output: {
        tourId: result.id,
        name: result.name,
        publishedAt: result.published_at
      },
      message: `Tour **${result.name || result.id}** has been updated.`
    };
  })
  .build();
