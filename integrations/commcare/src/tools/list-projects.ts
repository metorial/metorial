import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description:
    'Discover CommCare project spaces available to the authenticated web user, including their domain names and project names.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of projects to return; defaults to 20.'),
      offset: z.number().optional().describe('Number of projects to skip; defaults to 0.')
    })
  )
  .output(
    z.object({
      projects: z.array(z.object({ domain: z.string(), projectName: z.string() })),
      totalCount: z.number(),
      hasMore: z.boolean(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });
    let result = await client.listProjects(ctx.input);
    return {
      output: {
        projects: result.objects.map(project => ({
          domain: project.domain_name,
          projectName: project.project_name
        })),
        totalCount: result.meta.total_count,
        hasMore: result.meta.next !== null,
        limit: result.meta.limit,
        offset: result.meta.offset
      },
      message: `Found **${result.meta.total_count}** accessible projects.`
    };
  })
  .build();
