import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listEnvironments = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all environments in the current space. Returns environment names, status, and metadata.`,
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
            environmentId: z.string().describe('Environment ID.'),
            name: z.string().describe('Environment name.'),
            status: z
              .string()
              .optional()
              .describe('Environment status (e.g. "ready", "queued").'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp.'),
            updatedAt: z.string().optional().describe('ISO 8601 last update timestamp.')
          })
        )
        .describe('List of environments.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.getEnvironments();

    let environments = (result.items || []).map((e: any) => ({
      environmentId: e.sys?.id,
      name: e.name,
      status: e.sys?.status?.sys?.id,
      createdAt: e.sys?.createdAt,
      updatedAt: e.sys?.updatedAt
    }));

    return {
      output: { environments },
      message: `Found **${environments.length}** environments.`
    };
  })
  .build();
