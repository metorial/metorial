import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve a list of projects from Project Bubble. Supports filtering by client, dates, tags, and status. Use this to browse existing projects or find specific ones matching criteria.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.string().optional().describe('Filter projects by client ID'),
      dueFrom: z
        .string()
        .optional()
        .describe('Filter projects due from this date (yyyymmdd format)'),
      dueTo: z
        .string()
        .optional()
        .describe('Filter projects due to this date (yyyymmdd format)'),
      createdFrom: z
        .string()
        .optional()
        .describe('Filter projects created from this date (yyyymmdd format)'),
      createdTo: z
        .string()
        .optional()
        .describe('Filter projects created to this date (yyyymmdd format)'),
      tag: z.string().optional().describe('Filter projects by tag'),
      status: z
        .enum(['open', 'closed', 'templates', 'archived'])
        .optional()
        .describe('Filter projects by status'),
      order: z
        .enum(['projectname', 'duedate', 'progress', 'billablehours', 'latest'])
        .optional()
        .describe('Sort order for results'),
      limit: z.number().optional().describe('Maximum number of records to return (max 1000)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Project ID'),
            projectName: z.string().describe('Project name'),
            description: z.string().optional().describe('Project description'),
            startDate: z.string().optional().describe('Project start date'),
            dueDate: z.string().optional().describe('Project due date'),
            clientId: z.string().optional().describe('Associated client ID'),
            progress: z.number().optional().describe('Project progress percentage'),
            billableHours: z.number().optional().describe('Total billable hours'),
            users: z.array(z.any()).optional().describe('Assigned users'),
            teams: z.array(z.any()).optional().describe('Assigned teams')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.getProjects({
      clientId: ctx.input.clientId,
      dueFrom: ctx.input.dueFrom,
      dueTo: ctx.input.dueTo,
      createdFrom: ctx.input.createdFrom,
      createdTo: ctx.input.createdTo,
      tag: ctx.input.tag,
      status: ctx.input.status,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let data = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];

    let projects = data.map((p: any) => ({
      projectId: String(p.project_id),
      projectName: p.project_name || '',
      description: p.description || undefined,
      startDate: p.start_date || undefined,
      dueDate: p.due_date || undefined,
      clientId: p.client_id ? String(p.client_id) : undefined,
      progress: p.progress ?? undefined,
      billableHours: p.billable_hours ?? undefined,
      users: p.users || undefined,
      teams: p.teams || undefined
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
