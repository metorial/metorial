import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEnvironments = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all environments in a Split workspace. Returns environment names, IDs, production flags, and creation times. Useful for discovering available environments before managing flag definitions.`,
  tags: {
    readOnly: true
  }
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
      environments: z.array(
        z.object({
          environmentId: z.string(),
          environmentName: z.string(),
          production: z.boolean(),
          creationTime: z.number()
        })
      )
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
    let envs = await client.listEnvironments(wsId);
    if (
      envs.some(
        environment =>
          typeof environment.production !== 'boolean' ||
          typeof environment.creationTime !== 'number'
      )
    ) {
      throw createApiServiceError(
        'Split returned environment summaries without production or creationTime. This connection cannot supply the environment details required by this tool. Use the environment ID or name from your project settings for flag operations.'
      );
    }

    let environments = envs.map(e => ({
      environmentId: e.id,
      environmentName: e.name,
      production: e.production,
      creationTime: e.creationTime
    }));

    return {
      output: { environments },
      message: `Found **${environments.length}** environments.`
    };
  })
  .build();
