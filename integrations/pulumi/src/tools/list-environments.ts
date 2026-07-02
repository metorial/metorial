import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEnvironments = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all Pulumi ESC environments in an organization. Returns environment names, projects, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
      continuationToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      environments: z.array(
        z.object({
          organizationName: z.string().optional(),
          projectName: z.string().optional(),
          environmentName: z.string().optional(),
          created: z.string().optional(),
          modified: z.string().optional()
        })
      ),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;
    if (!org)
      throw new Error('Organization is required. Set it in config or provide it as input.');

    let result = await client.listEnvironments(org, ctx.input.continuationToken);

    let environments = (result.environments || []).map((e: any) => ({
      organizationName: e.organization,
      projectName: e.project,
      environmentName: e.name,
      created: e.created,
      modified: e.modified
    }));

    return {
      output: {
        environments,
        nextToken: result.nextToken
      },
      message: `Found **${environments.length}** environment(s) in organization **${org}**`
    };
  })
  .build();
