import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in your LaunchDarkly account. Returns project keys, names, tags, and environment counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of projects to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      filter: z.string().optional().describe('Filter expression'),
      sort: z.string().optional().describe('Sort field')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectKey: z.string().describe('Project key'),
          name: z.string().describe('Project name'),
          tags: z.array(z.string()).describe('Project tags'),
          environmentCount: z.number().describe('Number of environments')
        })
      ),
      totalCount: z.number().describe('Total number of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LaunchDarklyClient(ctx.auth.token);
    let result = await client.listProjects({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filter: ctx.input.filter,
      sort: ctx.input.sort
    });

    let items = result.items ?? [];
    let projects = items.map((p: any) => ({
      projectKey: p.key,
      name: p.name,
      tags: p.tags ?? [],
      environmentCount: (p.environments ?? []).length
    }));

    return {
      output: {
        projects,
        totalCount: result.totalCount ?? items.length
      },
      message: `Found **${result.totalCount ?? items.length}** projects.`
    };
  })
  .build();
