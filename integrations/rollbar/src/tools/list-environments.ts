import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEnvironments = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all environments that have been seen for a Rollbar project. Useful for discovering available environments to filter items, occurrences, and deploys.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
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
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listEnvironments();
    let environments = (result?.result || []).map((e: any) => ({
      name: e.name || e,
      visible: e.visible
    }));

    return {
      output: { environments },
      message: `Found **${environments.length}** environments.`
    };
  })
  .build();
