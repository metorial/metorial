import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.number().describe('Unique ID of the project'),
  clientId: z.number().optional().describe('Associated client ID'),
  name: z.string().describe('Project name'),
  number: z.string().optional().describe('Unique project number'),
  rate: z.number().optional().describe('Hourly rate or fixed amount'),
  budgetType: z.number().optional().describe('Budget type: 0 = hours, 1 = amount'),
  projectType: z.number().optional().describe('Project type: 0 = hourly, 2 = fixed'),
  budget: z.number().optional().describe('Budget amount or hours'),
  workedHours: z.number().optional().describe('Total hours worked'),
  unbilledHours: z.number().optional().describe('Unbilled hours'),
  cost: z.number().optional().describe('Total cost incurred'),
  status: z.number().optional().describe('Status: 1 = Active, 2 = Completed, 4 = Billable'),
  description: z.string().optional().describe('Project description')
});

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Clientary. Projects serve as containers for tasks, time entries, expenses, and invoices tied to a client.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Project name (required)'),
      rate: z.number().describe('Hourly rate or fixed amount (required)'),
      clientId: z.number().optional().describe('Client ID to associate with'),
      budgetType: z
        .number()
        .optional()
        .describe('Budget type: 0 = total budgeted hours, 1 = total budgeted amount'),
      projectType: z
        .number()
        .optional()
        .describe('Project type: 0 = hourly rate, 2 = fixed amount'),
      budget: z.number().optional().describe('Budget value (hours or amount)'),
      description: z.string().optional().describe('Project description')
    })
  )
  .output(projectSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {
      name: ctx.input.name,
      rate: ctx.input.rate
    };
    if (ctx.input.clientId) data.client_id = ctx.input.clientId;
    if (ctx.input.budgetType !== undefined) data.budget_type = ctx.input.budgetType;
    if (ctx.input.projectType !== undefined) data.project_type = ctx.input.projectType;
    if (ctx.input.budget !== undefined) data.budget = ctx.input.budget;
    if (ctx.input.description) data.description = ctx.input.description;

    let result = await client.createProject(data);
    let p = result.project || result;

    return {
      output: mapProject(p),
      message: `Created project **${p.name}** (ID: ${p.id}).`
    };
  })
  .build();

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project's settings, rate, budget, or description.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to update'),
      name: z.string().optional().describe('Project name'),
      rate: z.number().optional().describe('Hourly rate or fixed amount'),
      clientId: z.number().optional().describe('Client ID'),
      budgetType: z.number().optional().describe('Budget type: 0 = hours, 1 = amount'),
      projectType: z.number().optional().describe('Project type: 0 = hourly, 2 = fixed'),
      budget: z.number().optional().describe('Budget value'),
      description: z.string().optional().describe('Project description')
    })
  )
  .output(projectSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.rate !== undefined) data.rate = ctx.input.rate;
    if (ctx.input.clientId !== undefined) data.client_id = ctx.input.clientId;
    if (ctx.input.budgetType !== undefined) data.budget_type = ctx.input.budgetType;
    if (ctx.input.projectType !== undefined) data.project_type = ctx.input.projectType;
    if (ctx.input.budget !== undefined) data.budget = ctx.input.budget;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;

    let result = await client.updateProject(ctx.input.projectId, data);
    let p = result.project || result;

    return {
      output: mapProject(p),
      message: `Updated project **${p.name}** (ID: ${p.id}).`
    };
  })
  .build();

export let getProjects = SlateTool.create(spec, {
  name: 'Get Projects',
  key: 'get_projects',
  description: `Retrieve a specific project by ID or list projects. By default returns only active/billable projects. Use \`filter: "all"\` to include closed projects.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .number()
        .optional()
        .describe('ID of a specific project. If omitted, lists projects.'),
      clientId: z.number().optional().describe('Filter projects by client ID'),
      filter: z
        .enum(['active', 'all'])
        .optional()
        .describe(
          'Filter: "active" (default) returns active/billable only, "all" includes closed'
        ),
      page: z.number().optional().describe('Page number for pagination (20 results per page)')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects'),
      totalCount: z.number().optional().describe('Total number of matching projects'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    if (ctx.input.projectId) {
      let result = await client.getProject(ctx.input.projectId);
      let p = result.project || result;
      return {
        output: { projects: [mapProject(p)] },
        message: `Retrieved project **${p.name}** (ID: ${p.id}).`
      };
    }

    let result = await client.listProjects({
      page: ctx.input.page,
      clientId: ctx.input.clientId,
      filter: ctx.input.filter
    });

    let projects = (result.projects || []).map(mapProject);

    return {
      output: {
        projects,
        totalCount: result.total_count,
        pageCount: result.page_count
      },
      message: `Retrieved ${projects.length} project(s).`
    };
  })
  .build();

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a project. **Warning:** This also deletes all associated tasks, logged hours, comments, and notes.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { success: true },
      message: `Deleted project ID ${ctx.input.projectId} and all associated data.`
    };
  })
  .build();

let mapProject = (p: any) => ({
  projectId: p.id,
  clientId: p.client_id,
  name: p.name,
  number: p.number,
  rate: p.rate,
  budgetType: p.budget_type,
  projectType: p.project_type,
  budget: p.budget,
  workedHours: p.worked_hours,
  unbilledHours: p.unbilled_hours,
  cost: p.cost,
  status: p.status,
  description: p.description
});
