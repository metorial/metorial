import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoProjectsClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import { spec } from '../spec';

let isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let mapProjectsV3Record = (result: unknown, keys: string[]) => {
  if (!isRecord(result)) return undefined;

  for (let key of keys) {
    let value = result[key];
    if (isRecord(value)) return value;
    if (Array.isArray(value) && isRecord(value[0])) return value[0];
  }

  return result;
};

export let projectsV3TaskDate = (value: string) => {
  let match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[1]}-${match[2]}T00:00:00.000Z` : value;
};

let buildTaskData = (input: {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority?: string;
  status?: string;
  owners?: string;
  percentComplete?: number;
}) => {
  let data: Record<string, any> = {};
  if (input.name) data.name = input.name;
  if (input.description) data.description = input.description;
  if (input.startDate) data.start_date = projectsV3TaskDate(input.startDate);
  if (input.endDate) data.end_date = projectsV3TaskDate(input.endDate);
  if (input.priority) data.priority = input.priority.toLowerCase();
  if (input.status) data.status = { id: input.status };
  if (input.owners) {
    let owners = input.owners
      .split(',')
      .map(zpuid => zpuid.trim())
      .filter(Boolean)
      .map(zpuid => ({ zpuid }));
    if (owners.length > 0) data.owners_and_work = { owners };
  }
  if (input.percentComplete !== undefined) {
    data.completion_percentage = input.percentComplete;
  }
  return data;
};

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
      status: z.string().optional().describe('Zoho Projects V3 task status ID'),
      owners: z
        .string()
        .optional()
        .describe(
          'Comma-separated owner ZPUIDs; legacy Zoho user IDs or ZUIDs are not accepted by V3'
        ),
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
    let client = new ZohoProjectsClient({
      ...ctx.auth,
      portalId: ctx.input.portalId
    });

    if (ctx.input.action === 'get') {
      if (!ctx.input.taskId) throw zohoServiceError('taskId is required for get');
      let result = await client.getTask(ctx.input.projectId, ctx.input.taskId);
      let task = mapProjectsV3Record(result, ['task', 'tasks']);
      return {
        output: { task },
        message: `Fetched task **${task?.name || ctx.input.taskId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw zohoServiceError('name is required for create');
      let result = await client.createTask(ctx.input.projectId, buildTaskData(ctx.input));
      let task = mapProjectsV3Record(result, ['task', 'tasks']);
      return {
        output: { task },
        message: `Created task **${task?.name}** in project **${ctx.input.projectId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.taskId) throw zohoServiceError('taskId is required for update');
      let result = await client.updateTask(
        ctx.input.projectId,
        ctx.input.taskId,
        buildTaskData(ctx.input)
      );
      let task = mapProjectsV3Record(result, ['task', 'tasks']);
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
