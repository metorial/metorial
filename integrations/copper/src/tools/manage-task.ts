import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskOutputSchema = z.object({
  taskId: z.number().describe('Unique ID of the task'),
  name: z.string().nullable().describe('Task name'),
  assigneeId: z.number().nullable().optional().describe('Assigned user ID'),
  relatedResource: z
    .object({
      resourceId: z.number().optional(),
      type: z.string().optional()
    })
    .nullable()
    .optional()
    .describe('Related resource (entity linked to the task)'),
  dueDate: z.number().nullable().optional().describe('Due date (Unix timestamp)'),
  reminderDate: z.number().nullable().optional().describe('Reminder date (Unix timestamp)'),
  priority: z.string().nullable().optional().describe('Priority level'),
  status: z.string().nullable().optional().describe('Task status: "Open" or "Completed"'),
  details: z.string().nullable().optional().describe('Task details/description'),
  tags: z.array(z.string()).optional().describe('Tags'),
  dateCreated: z.number().nullable().optional().describe('Creation timestamp (Unix)'),
  dateModified: z.number().nullable().optional().describe('Last modified timestamp (Unix)'),
  customFields: z.array(z.any()).optional().describe('Custom field values')
});

let mapTask = (t: any) => ({
  taskId: t.id,
  name: t.name,
  assigneeId: t.assignee_id,
  relatedResource: t.related_resource
    ? {
        resourceId: t.related_resource.id,
        type: t.related_resource.type
      }
    : null,
  dueDate: t.due_date,
  reminderDate: t.reminder_date,
  priority: t.priority,
  status: t.status,
  details: t.details,
  tags: t.tags,
  dateCreated: t.date_created,
  dateModified: t.date_modified,
  customFields: t.custom_fields
});

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Copper CRM. Tasks can be linked to other entities (people, companies, opportunities, projects, or leads) and assigned to users.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Task name'),
      assigneeId: z.number().optional().describe('User ID to assign the task to'),
      relatedResourceId: z
        .number()
        .optional()
        .describe('ID of the entity to link this task to'),
      relatedResourceType: z
        .string()
        .optional()
        .describe(
          'Type of related entity: "person", "company", "opportunity", "lead", or "project"'
        ),
      dueDate: z.number().optional().describe('Due date as Unix timestamp'),
      reminderDate: z.number().optional().describe('Reminder date as Unix timestamp'),
      priority: z.string().optional().describe('Priority: "None", "Low", "Medium", or "High"'),
      status: z.string().optional().describe('Status: "Open" or "Completed"'),
      details: z.string().optional().describe('Task description or notes'),
      tags: z.array(z.string()).optional().describe('Tags'),
      customFields: z
        .array(
          z.object({
            customFieldDefinitionId: z.number(),
            value: z.any()
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.assigneeId) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.relatedResourceId && ctx.input.relatedResourceType) {
      body.related_resource = {
        id: ctx.input.relatedResourceId,
        type: ctx.input.relatedResourceType
      };
    }
    if (ctx.input.dueDate) body.due_date = ctx.input.dueDate;
    if (ctx.input.reminderDate) body.reminder_date = ctx.input.reminderDate;
    if (ctx.input.priority) body.priority = ctx.input.priority;
    if (ctx.input.status) body.status = ctx.input.status;
    if (ctx.input.details) body.details = ctx.input.details;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.customFields) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let task = await client.createTask(body);

    return {
      output: mapTask(task),
      message: `Created task **${task.name}** (ID: ${task.id}).`
    };
  })
  .build();

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve a task record by its ID. Returns full task details including status, assignee, related entity, and custom fields.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to retrieve')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let task = await client.getTask(ctx.input.taskId);

    return {
      output: mapTask(task),
      message: `Retrieved task **${task.name}** (ID: ${task.id}).`
    };
  })
  .build();

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in Copper CRM. Only provided fields will be updated. Use this to change status, reassign, update due dates, etc.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to update'),
      name: z.string().optional().describe('Updated task name'),
      assigneeId: z.number().optional().describe('Updated assignee user ID'),
      dueDate: z.number().optional().describe('Updated due date (Unix timestamp)'),
      reminderDate: z.number().optional().describe('Updated reminder date (Unix timestamp)'),
      priority: z.string().optional().describe('Updated priority'),
      status: z.string().optional().describe('Updated status: "Open" or "Completed"'),
      details: z.string().optional().describe('Updated description'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      customFields: z
        .array(
          z.object({
            customFieldDefinitionId: z.number(),
            value: z.any()
          })
        )
        .optional()
        .describe('Updated custom fields')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.assigneeId !== undefined) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.dueDate !== undefined) body.due_date = ctx.input.dueDate;
    if (ctx.input.reminderDate !== undefined) body.reminder_date = ctx.input.reminderDate;
    if (ctx.input.priority !== undefined) body.priority = ctx.input.priority;
    if (ctx.input.status !== undefined) body.status = ctx.input.status;
    if (ctx.input.details !== undefined) body.details = ctx.input.details;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let task = await client.updateTask(ctx.input.taskId, body);

    return {
      output: mapTask(task),
      message: `Updated task **${task.name}** (ID: ${task.id}).`
    };
  })
  .build();

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task from Copper CRM. This action cannot be undone.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to delete')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the deleted task'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteTask(ctx.input.taskId);

    return {
      output: { taskId: ctx.input.taskId, deleted: true },
      message: `Deleted task with ID ${ctx.input.taskId}.`
    };
  })
  .build();

export let searchTasks = SlateTool.create(spec, {
  name: 'Search Tasks',
  key: 'search_tasks',
  description: `Search for tasks in Copper CRM with flexible filtering. Supports filtering by assignee, status, tags, due date range, and more.`,
  constraints: ['Maximum 200 results per page'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      pageNumber: z.number().optional().default(1).describe('Page number (starting at 1)'),
      pageSize: z.number().optional().default(20).describe('Results per page (max 200)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      assigneeIds: z.array(z.number()).optional().describe('Filter by assignee user IDs'),
      statuses: z
        .array(z.string())
        .optional()
        .describe('Filter by statuses: "Open" or "Completed"'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      minimumDueDate: z.number().optional().describe('Minimum due date (Unix timestamp)'),
      maximumDueDate: z.number().optional().describe('Maximum due date (Unix timestamp)')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema).describe('Matching task records'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {
      page_number: ctx.input.pageNumber,
      page_size: ctx.input.pageSize
    };
    if (ctx.input.sortBy) body.sort_by = ctx.input.sortBy;
    if (ctx.input.sortDirection) body.sort_direction = ctx.input.sortDirection;
    if (ctx.input.assigneeIds) body.assignee_ids = ctx.input.assigneeIds;
    if (ctx.input.statuses) body.statuses = ctx.input.statuses;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.minimumDueDate) body.minimum_due_date = ctx.input.minimumDueDate;
    if (ctx.input.maximumDueDate) body.maximum_due_date = ctx.input.maximumDueDate;

    let tasks = await client.searchTasks(body);

    return {
      output: {
        tasks: tasks.map(mapTask),
        count: tasks.length
      },
      message: `Found **${tasks.length}** tasks matching the search criteria.`
    };
  })
  .build();
