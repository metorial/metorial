import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoProjectsClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let projectsManageProject = SlateTool.create(spec, {
  name: 'Projects Manage Project',
  key: 'projects_manage_project',
  description: `Create, update, delete, or list projects in Zoho Projects. Manage project names, descriptions, status, start/end dates, and owners. Also supports listing tasks and milestones within a project.`,
  instructions: [
    'The portalId is required for all Zoho Projects operations.',
    'Use action "list_tasks" or "list_milestones" with a projectId to view items within a project.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      portalId: z.string().describe('Zoho Projects portal ID'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'list_tasks', 'list_milestones'])
        .describe('Operation to perform'),
      projectId: z
        .string()
        .optional()
        .describe(
          'Project ID (required for get, update, delete, list_tasks, list_milestones)'
        ),
      name: z.string().optional().describe('Project name (required for create)'),
      description: z.string().optional().describe('Project description'),
      status: z.string().optional().describe('Project status (e.g., "active", "archived")'),
      startDate: z.string().optional().describe('Start date (MM-dd-yyyy)'),
      endDate: z.string().optional().describe('End date (MM-dd-yyyy)'),
      ownerId: z.string().optional().describe('Project owner user ID'),
      index: z.number().optional().describe('Start index for pagination'),
      range: z.number().optional().describe('Number of records to return')
    })
  )
  .output(
    z.object({
      projects: z.array(z.record(z.string(), z.any())).optional().describe('List of projects'),
      project: z.record(z.string(), z.any()).optional().describe('Single project'),
      tasks: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Tasks within a project'),
      milestones: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Milestones within a project'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let client = new ZohoProjectsClient({
      token: ctx.auth.token,
      datacenter: dc,
      portalId: ctx.input.portalId
    });

    if (ctx.input.action === 'list') {
      let result = await client.listProjects({
        index: ctx.input.index,
        range: ctx.input.range,
        status: ctx.input.status
      });
      let projects = result?.projects || [];
      return {
        output: { projects },
        message: `Retrieved **${projects.length}** projects.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.projectId) throw zohoServiceError('projectId is required for get');
      let result = await client.getProject(ctx.input.projectId);
      let project = result?.projects?.[0] || result;
      return {
        output: { project },
        message: `Fetched project **${project?.name || ctx.input.projectId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw zohoServiceError('name is required for create');
      let data: Record<string, any> = {};
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.status) data.status = ctx.input.status;
      if (ctx.input.startDate) data.start_date = ctx.input.startDate;
      if (ctx.input.endDate) data.end_date = ctx.input.endDate;
      if (ctx.input.ownerId) data.owner = ctx.input.ownerId;

      let result = await client.createProject(data);
      let project = result?.projects?.[0] || result;
      return {
        output: { project },
        message: `Created project **${project?.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.projectId) throw zohoServiceError('projectId is required for update');
      let data: Record<string, any> = {};
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.status) data.status = ctx.input.status;
      if (ctx.input.startDate) data.start_date = ctx.input.startDate;
      if (ctx.input.endDate) data.end_date = ctx.input.endDate;
      if (ctx.input.ownerId) data.owner = ctx.input.ownerId;

      let result = await client.updateProject(ctx.input.projectId, data);
      let project = result?.projects?.[0] || result;
      return {
        output: { project },
        message: `Updated project **${ctx.input.projectId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.projectId) throw zohoServiceError('projectId is required for delete');
      await client.deleteProject(ctx.input.projectId);
      return {
        output: { deleted: true },
        message: `Deleted project **${ctx.input.projectId}**.`
      };
    }

    if (ctx.input.action === 'list_tasks') {
      if (!ctx.input.projectId) throw zohoServiceError('projectId is required for list_tasks');
      let result = await client.listTasks(ctx.input.projectId, {
        index: ctx.input.index,
        range: ctx.input.range,
        status: ctx.input.status
      });
      let tasks = result?.tasks || [];
      return {
        output: { tasks },
        message: `Retrieved **${tasks.length}** tasks from project **${ctx.input.projectId}**.`
      };
    }

    if (ctx.input.action === 'list_milestones') {
      if (!ctx.input.projectId)
        throw zohoServiceError('projectId is required for list_milestones');
      let result = await client.listMilestones(ctx.input.projectId, {
        index: ctx.input.index,
        range: ctx.input.range,
        status: ctx.input.status
      });
      let milestones = result?.milestones || [];
      return {
        output: { milestones },
        message: `Retrieved **${milestones.length}** milestones from project **${ctx.input.projectId}**.`
      };
    }

    throw zohoServiceError('Invalid Projects project action.');
  })
  .build();
