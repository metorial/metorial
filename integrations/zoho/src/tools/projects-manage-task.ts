import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoProjectsClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let projectsManageTask = SlateTool.create(spec, {
  name: 'Projects Manage Task',
  key: 'projects_manage_task',
  description: `Create, update, delete, or retrieve tasks within a Zoho Projects project. Set task names, descriptions, owners, priority, start/end dates, and status.`,
  instructions: ['Both portalId and projectId are required.', 'For create, name is required.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      portalId: z.string().describe('Zoho Projects portal ID'),
      projectId: z.string().describe('Project ID containing the task'),
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Operation to perform'),
      taskId: z.string().optional().describe('Task ID (required for get, update, delete)'),
      name: z.string().optional().describe('Task name (required for create)'),
      description: z.string().optional().describe('Task description'),
      startDate: z.string().optional().describe('Start date (MM-dd-yyyy)'),
      endDate: z.string().optional().describe('End date (MM-dd-yyyy)'),
      priority: z
        .string()
        .optional()
        .describe('Task priority (e.g., "None", "Low", "Medium", "High")'),
      status: z.string().optional().describe('Task status'),
      owners: z
        .string()
        .optional()
        .describe('Comma-separated user IDs to assign as task owners'),
      percentComplete: z.number().optional().describe('Completion percentage (0-100)')
    })
  )
  .output(
    z.object({
      task: z.record(z.string(), z.any()).optional().describe('Task record'),
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

    if (ctx.input.action === 'get') {
      if (!ctx.input.taskId) throw zohoServiceError('taskId is required for get');
      let result = await client.getTask(ctx.input.projectId, ctx.input.taskId);
      let task = result?.tasks?.[0] || result;
      return {
        output: { task },
        message: `Fetched task **${task?.name || ctx.input.taskId}**.`
      };
    }

    let buildData = () => {
      let data: Record<string, any> = {};
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.startDate) data.start_date = ctx.input.startDate;
      if (ctx.input.endDate) data.end_date = ctx.input.endDate;
      if (ctx.input.priority) data.priority = ctx.input.priority;
      if (ctx.input.status) data.status_name = ctx.input.status;
      if (ctx.input.owners) data.persons = ctx.input.owners;
      if (ctx.input.percentComplete !== undefined)
        data.percent_complete = ctx.input.percentComplete;
      return data;
    };

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw zohoServiceError('name is required for create');
      let result = await client.createTask(ctx.input.projectId, buildData());
      let task = result?.tasks?.[0] || result;
      return {
        output: { task },
        message: `Created task **${task?.name}** in project **${ctx.input.projectId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.taskId) throw zohoServiceError('taskId is required for update');
      let result = await client.updateTask(ctx.input.projectId, ctx.input.taskId, buildData());
      let task = result?.tasks?.[0] || result;
      return {
        output: { task },
        message: `Updated task **${ctx.input.taskId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.taskId) throw zohoServiceError('taskId is required for delete');
      await client.deleteTask(ctx.input.projectId, ctx.input.taskId);
      return {
        output: { deleted: true },
        message: `Deleted task **${ctx.input.taskId}**.`
      };
    }

    throw zohoServiceError('Invalid Projects task action.');
  })
  .build();
