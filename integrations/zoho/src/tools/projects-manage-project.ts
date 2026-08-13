import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoProjectsClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import { spec } from '../spec';

let isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export let mapProjectsV3List = (result: unknown, keys: string[]) => {
  if (Array.isArray(result)) return result.filter(isRecord);
  if (!isRecord(result)) return [];

  for (let key of keys) {
    if (Array.isArray(result[key])) return result[key].filter(isRecord);
  }

  return [];
};

export let mapProjectsV3Record = (result: unknown, keys: string[]) => {
  if (!isRecord(result)) return undefined;

  for (let key of keys) {
    let value = result[key];
    if (isRecord(value)) return value;
    if (Array.isArray(value) && isRecord(value[0])) return value[0];
  }

  return result;
};

export let projectsV3ProjectDate = (value: string) => {
  let match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[1]}-${match[2]}` : value;
};

let buildProjectData = (input: {
  name?: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  ownerId?: string;
}) => {
  let data: Record<string, any> = {};
  if (input.name) data.name = input.name;
  if (input.description) data.description = input.description;
  if (input.status) data.status = { id: input.status };
  if (input.startDate) data.start_date = projectsV3ProjectDate(input.startDate);
  if (input.endDate) data.end_date = projectsV3ProjectDate(input.endDate);
  if (input.ownerId) data.owner = { zpuid: input.ownerId };
  return data;
};

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
      status: z
        .string()
        .optional()
        .describe(
          'Status filter or mutation status ID. create/update require a V3 project status ID; list accepts "all", "active"/"open", "archived"/"closed", or a V3 project status ID (legacy "template" is unsupported); list_tasks accepts "all", "completed", "notcompleted", or a V3 task status ID; list_milestones accepts "all" or a V3 phase status ID (legacy "completed"/"notcompleted" is unsupported)'
        ),
      startDate: z.string().optional().describe('Start date (MM-dd-yyyy)'),
      endDate: z.string().optional().describe('End date (MM-dd-yyyy)'),
      ownerId: z
        .string()
        .optional()
        .describe(
          'Project owner ZPUID for create/update; legacy Zoho user IDs or ZUIDs are not accepted by V3'
        ),
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
    let client = new ZohoProjectsClient({
      ...ctx.auth,
      portalId: ctx.input.portalId
    });

    if (ctx.input.action === 'list') {
      let result = await client.listProjects({
        index: ctx.input.index,
        range: ctx.input.range,
        status: ctx.input.status
      });
      let projects = mapProjectsV3List(result, ['projects']);
      return {
        output: { projects },
        message: `Retrieved **${projects.length}** projects.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.projectId) throw zohoServiceError('projectId is required for get');
      let result = await client.getProject(ctx.input.projectId);
      let project = mapProjectsV3Record(result, ['project', 'projects']);
      return {
        output: { project },
        message: `Fetched project **${project?.name || ctx.input.projectId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw zohoServiceError('name is required for create');
      let result = await client.createProject(buildProjectData(ctx.input));
      let project = mapProjectsV3Record(result, ['project', 'projects']);
      return {
        output: { project },
        message: `Created project **${project?.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.projectId) throw zohoServiceError('projectId is required for update');
      let result = await client.updateProject(
        ctx.input.projectId,
        buildProjectData(ctx.input)
      );
      let project = mapProjectsV3Record(result, ['project', 'projects']);
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
      let tasks = mapProjectsV3List(result, ['tasks']);
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
      let milestones = mapProjectsV3List(result, ['milestones', 'phases']);
      return {
        output: { milestones },
        message: `Retrieved **${milestones.length}** milestones from project **${ctx.input.projectId}**.`
      };
    }

    throw zohoServiceError('Invalid Projects project action.');
  })
  .build();
