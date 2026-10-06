import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, pageInfo } from '../lib/helpers';
import { limitSchema, pageOutput, selection, skipSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listEnvironments = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all environments in the current space. Returns environment names, status, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ ...selection, limit: limitSchema, skip: skipSchema }))
  .output(
    z.object({
      ...pageOutput,
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
    let client = createClient(ctx.config, ctx.auth, ctx.input);
    let result = await client.getEnvironments({
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let environments = result.items.map((e: any) => ({
      environmentId: e.sys?.id,
      name: e.name,
      status: e.sys?.status?.sys?.id,
      createdAt: e.sys?.createdAt,
      updatedAt: e.sys?.updatedAt
    }));

    return {
      output: { ...pageInfo(result), environments },
      message: `Found **${environments.length}** environments.`
    };
  })
  .build();
