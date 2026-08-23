import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { requireProjectKey } from '../lib/inputs';
import { spec } from '../spec';

export let listEnvironments = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all environments within a LaunchDarkly project. Returns environment keys, names, colors, and SDK keys.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectKey: z.string().optional().describe('Project key. Falls back to config default.'),
      limit: z.number().optional().describe('Maximum number of environments to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      filter: z
        .string()
        .optional()
        .describe('Filter by query or tags, for example "query:prod,tags:critical"'),
      sort: z
        .string()
        .optional()
        .describe('Sort by createdOn, critical, or name; prefix with - for descending')
    })
  )
  .output(
    z.object({
      environments: z.array(
        z.object({
          environmentKey: z.string().describe('Environment key'),
          name: z.string().describe('Environment name'),
          color: z.string().describe('Environment color hex'),
          sdkKey: z.string().optional().describe('Server-side SDK key'),
          mobileKey: z.string().optional().describe('Mobile SDK key'),
          defaultTtl: z.number().optional().describe('Default TTL in minutes')
        })
      ),
      totalCount: z.number().describe('Total number of environments')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = requireProjectKey(ctx.input.projectKey, ctx.config.projectKey);

    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let result = await client.listEnvironments(projectKey, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filter: ctx.input.filter,
      sort: ctx.input.sort
    });

    let items = result.items ?? [];
    let environments = items.map((env: any) => ({
      environmentKey: env.key,
      name: env.name,
      color: env.color,
      sdkKey: env.apiKey,
      mobileKey: env.mobileKey,
      defaultTtl: env.defaultTtl
    }));

    return {
      output: {
        environments,
        totalCount: result.totalCount ?? items.length
      },
      message: `Found **${result.totalCount ?? items.length}** environments in project \`${projectKey}\`.`
    };
  })
  .build();
