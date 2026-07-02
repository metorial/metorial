import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific project by its ID. Returns the project's name, description, dates, progress, assigned users and teams, and billing information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project to retrieve')
    })
  )
  .output(
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
      teams: z.array(z.any()).optional().describe('Assigned teams'),
      dateCreated: z.string().optional().describe('Date the project was created'),
      dateModified: z.string().optional().describe('Date the project was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.getProjects({ projectId: ctx.input.projectId });
    let p = result?.data?.[0] || result?.data || result;

    return {
      output: {
        projectId: String(p.project_id),
        projectName: p.project_name || '',
        description: p.description || undefined,
        startDate: p.start_date || undefined,
        dueDate: p.due_date || undefined,
        clientId: p.client_id ? String(p.client_id) : undefined,
        progress: p.progress ?? undefined,
        billableHours: p.billable_hours ?? undefined,
        users: p.users || undefined,
        teams: p.teams || undefined,
        dateCreated: p.date_created || undefined,
        dateModified: p.date_modified || undefined
      },
      message: `Retrieved project **${p.project_name}**.`
    };
  })
  .build();
