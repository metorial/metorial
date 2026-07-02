import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  state: z.string().nullable(),
  budget: z.number().nullable()
});

export let manageProjects = SlateTool.create(spec, {
  name: 'Manage Projects',
  key: 'manage_projects',
  description: `List, get, create, update, or delete projects. Projects are used to group time entries and financial data for specific work.`,
  instructions: [
    'Project names must be unique within the administration.',
    'For "list", use filter "state:active", "state:archived", or "state:all".'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      projectId: z.string().optional().describe('Project ID (for get, update, delete)'),
      name: z.string().optional().describe('Project name (for create/update)'),
      budget: z.number().optional().nullable().describe('Budget amount (for create/update)'),
      filter: z.string().optional().describe('Filter for list (e.g., "state:active")'),
      page: z.number().optional().describe('Page number (for list)'),
      perPage: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      project: projectSchema.optional(),
      projects: z.array(projectSchema).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let mapProject = (p: any) => ({
      projectId: String(p.id),
      name: p.name || '',
      state: p.state || null,
      budget: p.budget ?? null
    });

    switch (ctx.input.action) {
      case 'list': {
        let projects = await client.listProjects({
          filter: ctx.input.filter,
          page: ctx.input.page,
          perPage: ctx.input.perPage
        });
        let mapped = projects.map(mapProject);
        return {
          output: { projects: mapped },
          message: `Found ${mapped.length} project(s).`
        };
      }
      case 'get': {
        if (!ctx.input.projectId) throw new Error('projectId is required for get');
        let project = await client.getProject(ctx.input.projectId);
        return {
          output: { project: mapProject(project) },
          message: `Retrieved project **${project.name}**.`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required for create');
        let projectData: Record<string, any> = { name: ctx.input.name };
        if (ctx.input.budget !== undefined) projectData.budget = ctx.input.budget;
        let project = await client.createProject(projectData);
        return {
          output: { project: mapProject(project) },
          message: `Created project **${project.name}**.`
        };
      }
      case 'update': {
        if (!ctx.input.projectId) throw new Error('projectId is required for update');
        let projectData: Record<string, any> = {};
        if (ctx.input.name !== undefined) projectData.name = ctx.input.name;
        if (ctx.input.budget !== undefined) projectData.budget = ctx.input.budget;
        let project = await client.updateProject(ctx.input.projectId, projectData);
        return {
          output: { project: mapProject(project) },
          message: `Updated project **${project.name}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.projectId) throw new Error('projectId is required for delete');
        await client.deleteProject(ctx.input.projectId);
        return {
          output: { deleted: true },
          message: `Deleted project ${ctx.input.projectId}.`
        };
      }
    }
  });
