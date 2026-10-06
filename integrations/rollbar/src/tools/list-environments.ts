import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let listEnvironments = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all environments that have been seen for a Rollbar project. Useful for discovering available environments to filter items, occurrences, and deploys.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.'),
      page: z.number().optional().describe('Page number, starting at 1'),
      limit: z.number().optional().describe('Page size, default 20; maximum 5000')
    })
  )
  .output(
    z.object({
      environments: z
        .array(
          z.object({
            name: z.string().describe('Environment name'),
            visible: z
              .boolean()
              .optional()
              .describe('Whether the environment is visible in the UI')
          })
        )
        .describe('List of project environments')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listEnvironments({
      page: ctx.input.page,
      limit: ctx.input.limit
    });
    let environments = result.result.environments.map(e => ({
      name: e.environment,
      visible: e.visible === undefined ? undefined : Boolean(e.visible)
    }));

    return {
      output: { environments },
      message: `Found **${environments.length}** environments.`
    };
  })
  .build();
