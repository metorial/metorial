import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { collection, requiredId } from '../lib/response';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in CATS. Tasks can be assigned to users, prioritized, and optionally associated with a candidate, contact, company, or job.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      description: z.string().describe('Task description'),
      dueDate: z.string().optional().describe('Due date (RFC 3339)'),
      priority: z.number().optional().describe('Priority level (1-5, 1 = lowest)'),
      assignedToUserId: z.number().optional().describe('User ID to assign the task to'),
      regardingType: z
        .enum(['candidate', 'contact', 'company', 'job'])
        .optional()
        .describe('Type of record this task relates to'),
      regardingId: z.number().optional().describe('ID of the related record'),
      isCompleted: z.boolean().optional().describe('Whether the task is completed')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the created task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      description: ctx.input.description
    };
    if (ctx.input.dueDate !== undefined) body.date_due = ctx.input.dueDate;
    if (ctx.input.priority !== undefined) body.priority = ctx.input.priority;
    if (ctx.input.assignedToUserId !== undefined)
      body.assigned_to_id = ctx.input.assignedToUserId;
    if ((ctx.input.regardingType === undefined) !== (ctx.input.regardingId === undefined)) {
      throw createApiServiceError('Provide regardingType and regardingId together.');
    }
    if (ctx.input.regardingType !== undefined) {
      body.data_item = { type: ctx.input.regardingType, id: ctx.input.regardingId };
    }

    let result = await client.createTask(body);
    let taskId = requiredId(result?.id, 'created record');

    if (ctx.input.isCompleted !== undefined) {
      try {
        await client.updateTask(taskId, { is_completed: ctx.input.isCompleted });
      } catch {
        throw createApiServiceError(
          `Task ${taskId} was created, but setting its completion state failed. Inspect it with get_task before retrying.`
        );
      }
    }

    return {
      output: { taskId },
      message: `Created task "${ctx.input.description}" (ID: ${taskId}).`
    };
  })
  .build();

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve a single task by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      description: z.string().optional().describe('Task description'),
      dueDate: z.string().optional().describe('Due date'),
      priority: z.number().optional().describe('Priority (1-5)'),
      isCompleted: z.boolean().optional().describe('Whether completed'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Updated date'),
      raw: z.any().optional().describe('Complete provider response, retaining null values'),
      links: z.any().optional().describe('HAL links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getTask(ctx.input.taskId);

    return {
      output: {
        taskId: requiredId(data?.id, 'record'),
        description: data.description ?? undefined,
        dueDate: data.date_due ?? undefined,
        priority: data.priority ?? undefined,
        isCompleted: data.is_completed ?? undefined,
        createdAt: data.date_created ?? undefined,
        updatedAt: data.date_updated ?? undefined,
        raw: data,
        links: data._links
      },
      message: `Retrieved task **${ctx.input.taskId}**.`
    };
  })
  .build();

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task. Use this to change the description, due date, priority, assignment, or mark a task as completed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to update'),
      description: z.string().optional().describe('Task description'),
      dueDate: z.string().optional().describe('Due date (RFC 3339)'),
      priority: z.number().optional().describe('Priority (1-5)'),
      assignedToUserId: z.number().optional().describe('Assigned user ID'),
      isCompleted: z.boolean().optional().describe('Whether completed')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Updated task ID'),
      updated: z.boolean().describe('Whether successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.dueDate !== undefined) body.date_due = ctx.input.dueDate;
    if (ctx.input.priority !== undefined) body.priority = ctx.input.priority;
    if (ctx.input.assignedToUserId !== undefined)
      body.assigned_to_id = ctx.input.assignedToUserId;
    if (ctx.input.isCompleted !== undefined) body.is_completed = ctx.input.isCompleted;

    await client.updateTask(ctx.input.taskId, body);

    return {
      output: {
        taskId: ctx.input.taskId,
        updated: true
      },
      message: `Updated task **${ctx.input.taskId}**.`
    };
  })
  .build();

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks with pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max: 100)')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('Task ID'),
            description: z.string().optional().describe('Description'),
            dueDate: z.string().optional().describe('Due date'),
            priority: z.number().optional().describe('Priority'),
            isCompleted: z.boolean().optional().describe('Whether completed')
          })
        )
        .describe('Tasks'),
      totalCount: z.number().optional().describe('Total count'),
      currentPage: z.number().optional().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listTasks({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let tasks = collection(data, 'tasks').map((t: any) => ({
      taskId: requiredId(t.id, 'record'),
      description: t.description ?? undefined,
      dueDate: t.date_due ?? undefined,
      priority: t.priority ?? undefined,
      isCompleted: t.is_completed ?? undefined
    }));

    return {
      output: {
        tasks,
        totalCount: data?.total ?? undefined,
        currentPage: data?.page ?? ctx.input.page ?? 1
      },
      message: `Listed **${tasks.length}** task(s).`
    };
  })
  .build();
