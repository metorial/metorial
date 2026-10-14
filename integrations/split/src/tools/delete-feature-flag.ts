import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteFeatureFlag = SlateTool.create(spec, {
  name: 'Delete Feature Flag',
  key: 'delete_feature_flag',
  description: `Permanently delete a feature flag from all environments. This removes the flag definition everywhere and cannot be undone. Use the update tool with \`killed: true\` to temporarily disable a flag instead.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID. Call list_workspaces to discover IDs. Falls back to the configured default.'
        ),
      flagName: z.string().describe('Name of the feature flag to delete.')
    })
  )
  .output(
    z.object({
      flagName: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!wsId) {
      throw createApiServiceError(
        'workspaceId is required. Call list_workspaces to discover IDs, then pass the ID or set the default workspace.'
      );
    }

    let client = new Client(ctx.auth);
    await client.deleteFeatureFlag(wsId, ctx.input.flagName);

    return {
      output: {
        flagName: ctx.input.flagName,
        deleted: true
      },
      message: `Deleted feature flag **${ctx.input.flagName}** from all environments.`
    };
  })
  .build();
