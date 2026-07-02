import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve a list of projects from Teamwork. Supports filtering by status, company, category, and search term. Use pagination to navigate large result sets.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'archived', 'all'])
        .optional()
        .describe('Filter by project status'),
      searchTerm: z.string().optional().describe('Search projects by name'),
      companyId: z.string().optional().describe('Filter by company ID'),
      categoryId: z.string().optional().describe('Filter by category ID'),
      orderBy: z.string().optional().describe('Sort field (e.g. "name", "lastActivityAt")'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Unique ID of the project'),
            name: z.string().describe('Project name'),
            description: z.string().optional().describe('Project description'),
            status: z.string().optional().describe('Project status'),
            companyName: z.string().optional().describe('Associated company name'),
            startDate: z.string().optional().describe('Project start date'),
            endDate: z.string().optional().describe('Project end date')
          })
        )
        .describe('List of projects'),
      totalCount: z.number().optional().describe('Total number of matching projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listProjects({
      status: ctx.input.status,
      searchTerm: ctx.input.searchTerm,
      companyId: ctx.input.companyId,
      categoryId: ctx.input.categoryId,
      orderBy: ctx.input.orderBy,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let projects = (result.projects || []).map((p: any) => ({
      projectId: String(p.id),
      name: p.name || '',
      description: p.description || undefined,
      status: p.status || undefined,
      companyName: p.company?.name || undefined,
      startDate: p['start-date'] || p.startDate || undefined,
      endDate: p['end-date'] || p.endDate || undefined
    }));

    return {
      output: {
        projects,
        totalCount: result.STATUS === 'OK' ? projects.length : undefined
      },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
