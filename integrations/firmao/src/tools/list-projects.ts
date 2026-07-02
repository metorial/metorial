import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Search and list projects from Firmao. Supports filtering by name and pagination. Projects serve as containers for tasks and can track budgets, team members, and timelines.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum results to return'),
      sort: z.string().optional().describe('Field to sort by'),
      dir: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter projects whose name contains this value')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          status: z.string().optional(),
          budget: z.number().optional(),
          creationDate: z.string().optional(),
          lastModificationDate: z.string().optional()
        })
      ),
      totalSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let filters: Record<string, string> = {};
    if (ctx.input.nameContains) filters['name(contains)'] = ctx.input.nameContains;

    let result = await client.list('projects', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let projects = result.data.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      description: p.description,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
      budget: p.budget,
      creationDate: p.creationDate,
      lastModificationDate: p.lastModificationDate
    }));

    return {
      output: { projects, totalSize: result.totalSize },
      message: `Found **${projects.length}** project(s) (total: ${result.totalSize}).`
    };
  })
  .build();
