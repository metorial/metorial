import { SlateTool } from 'slates';
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
        .describe('Workspace ID. Falls back to the configured default.')
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
      throw new Error('workspaceId is required. Set it in config or pass it as input.');
    }

    let client = new Client({ token: ctx.auth.token });
    let envs = await client.listEnvironments(wsId);

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
