import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve a project by ID, or list projects with pagination. Returns project details including name, status, deadlines, and associated client.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('ID of a specific project to retrieve. If omitted, lists projects.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of projects per page')
    })
  )
  .output(
    z.object({
      projects: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of project records'),
      totalCount: z.number().optional().describe('Total number of projects'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.projectId) {
      let result = await client.getProject(ctx.input.projectId);
      return {
        output: { projects: [result.data] },
        message: `Retrieved project **${result.data.project_name ?? ctx.input.projectId}**.`
      };
    }

    let result = await client.listProjects(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        projects: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} project(s)${result.meta ? ` (page ${result.meta.current_page} of ${result.meta.last_page})` : ''}.`
    };
  })
  .build();
