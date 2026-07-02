import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExperimentationClient } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, retrieve, or list Optimizely Experimentation projects.
Projects are top-level containers that hold experiments, audiences, events, and feature flags.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'list']).describe('Action to perform'),
      projectId: z.number().optional().describe('Project ID (required for get/update)'),
      name: z.string().optional().describe('Project name (for create/update)'),
      description: z.string().optional().describe('Project description (for create/update)'),
      platform: z
        .string()
        .optional()
        .describe('Platform type, e.g. "web", "custom" (for create)'),
      page: z.number().optional().describe('Page number (for list)'),
      perPage: z.number().optional().describe('Items per page (for list)')
    })
  )
  .output(
    z.object({
      project: z.any().optional().describe('Project data'),
      projects: z.array(z.any()).optional().describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExperimentationClient(ctx.auth.token);

    switch (ctx.input.action) {
      case 'list': {
        let projects = await client.listProjects({
          page: ctx.input.page,
          per_page: ctx.input.perPage
        });
        return {
          output: { projects },
          message: `Listed ${Array.isArray(projects) ? projects.length : 0} projects.`
        };
      }
      case 'get': {
        if (!ctx.input.projectId) throw new Error('projectId is required');
        let project = await client.getProject(ctx.input.projectId);
        return {
          output: { project },
          message: `Retrieved project **${project.name}** (ID: ${project.id}).`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required for creating a project');
        let project = await client.createProject({
          name: ctx.input.name,
          description: ctx.input.description,
          platform: ctx.input.platform
        });
        return {
          output: { project },
          message: `Created project **${project.name}** (ID: ${project.id}).`
        };
      }
      case 'update': {
        if (!ctx.input.projectId) throw new Error('projectId is required');
        let updateData: Record<string, any> = {};
        if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
        if (ctx.input.description !== undefined)
          updateData.description = ctx.input.description;
        let project = await client.updateProject(ctx.input.projectId, updateData);
        return {
          output: { project },
          message: `Updated project **${project.name}** (ID: ${project.id}).`
        };
      }
    }
  })
  .build();
