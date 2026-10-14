import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description:
    'List the projects accessible to the API token, including project and organization names. Use this to confirm the project authorized by the connection.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z.number().optional().describe('Number of results per page'),
      query: z.string().optional().describe('Search project names'),
      ordering: z
        .enum(['-created', '-name', 'created', 'name'])
        .optional()
        .describe('Sort order')
    })
  )
  .output(
    z.object({
      totalCount: z.number(),
      projects: z.array(
        z.object({
          projectId: z.string(),
          name: z.string().nullable(),
          homepageUrl: z.string().nullable(),
          organizationId: z.string().nullable(),
          organizationName: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).listProjects(ctx.input);
    return {
      output: {
        totalCount: result.count,
        projects: result.results.map(project => ({
          projectId: project.id,
          name: project.name,
          homepageUrl: project.homepageUrl,
          organizationId: project.organizationId,
          organizationName: project.organizationName
        })),
        hasMore: Boolean(result.next)
      },
      message: `Found **${result.count}** authorized project(s).`
    };
  })
  .build();
