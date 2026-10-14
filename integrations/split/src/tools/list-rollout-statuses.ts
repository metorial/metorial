import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRolloutStatuses = SlateTool.create(spec, {
  name: 'List Rollout Statuses',
  key: 'list_rollout_statuses',
  description:
    'Discover rollout status IDs, names, and descriptions for a workspace. Use an ID with update_feature_flag to change a flag lifecycle status. Call list_workspaces to discover workspace IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID. Call list_workspaces to discover IDs. Falls back to the configured default.'
        )
    })
  )
  .output(
    z.object({
      rolloutStatuses: z.array(
        z.object({
          rolloutStatusId: z.string(),
          name: z.string(),
          description: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let workspaceId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!workspaceId)
      throw createApiServiceError(
        'workspaceId is required. Call list_workspaces to discover IDs, then provide a workspace.'
      );
    let client = new Client(ctx.auth);
    let statuses = await client.listRolloutStatuses(workspaceId);
    return {
      output: {
        rolloutStatuses: statuses.map(status => ({
          rolloutStatusId: status.id,
          name: status.name,
          description: status.description
        }))
      },
      message: `Found **${statuses.length}** rollout statuses.`
    };
  })
  .build();
