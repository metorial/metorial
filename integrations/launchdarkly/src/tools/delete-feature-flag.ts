import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteFeatureFlag = SlateTool.create(spec, {
  name: 'Delete Feature Flag',
  key: 'delete_feature_flag',
  description: `Permanently delete a feature flag from a project. This removes the flag from all environments. Use with caution — this cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectKey: z
        .string()
        .optional()
        .describe('Project key. Falls back to config default if not provided.'),
      flagKey: z.string().describe('Key of the flag to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the flag was successfully deleted'),
      flagKey: z.string().describe('Key of the deleted flag')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = ctx.input.projectKey ?? ctx.config.projectKey;
    if (!projectKey) {
      throw new Error(
        'projectKey is required. Provide it in the input or set a default in config.'
      );
    }

    let client = new LaunchDarklyClient(ctx.auth.token);
    await client.deleteFeatureFlag(projectKey, ctx.input.flagKey);

    return {
      output: {
        deleted: true,
        flagKey: ctx.input.flagKey
      },
      message: `Deleted feature flag \`${ctx.input.flagKey}\` from project \`${projectKey}\`.`
    };
  })
  .build();
