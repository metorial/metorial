import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

let linkedRecordObjectSchema = z.object({
  targetObject: z.string().describe('Object slug (e.g. "people", "companies")'),
  targetRecordId: z.string().describe('Record ID')
});

let linkedRecordSchema = z.union([
  z
    .string()
    .describe(
      'Record reference string accepted by Attio, such as a person email or company domain'
    ),
  linkedRecordObjectSchema
]);

let assigneeSchema = z.object({
  referencedActorType: z.string().describe('Actor type, typically "workspace-member"'),
  referencedActorId: z.string().describe('Actor ID')
});

let taskOutputSchema = z.object({
  taskId: z.string().describe('The task ID'),
  contentPlaintext: z.string().describe('Task content'),
  deadlineAt: z.string().optional().nullable().describe('Task deadline date'),
  isCompleted: z.boolean().describe('Whether the task is completed'),
  linkedRecords: z
    .array(
      z.object({
        targetObjectId: z.string().describe('Linked object ID'),
        targetRecordId: z.string().describe('Linked record ID')
      })
    )
    .describe('Records linked to this task'),
  assignees: z
    .array(
      z.object({
        referencedActorType: z.string().describe('Actor type'),
        referencedActorId: z.string().describe('Actor ID')
      })
    )
    .describe('Task assignees'),
  createdAt: z.string().describe('When the task was created')
});

let mapTask = (t: any) => ({
  taskId: t.id?.task_id ?? '',
  contentPlaintext: t.content_plaintext ?? '',
  deadlineAt: t.deadline_at ?? null,
  isCompleted: t.is_completed ?? false,
  linkedRecords: (t.linked_records ?? []).map((r: any) => ({
    targetObjectId: r.target_object_id ?? '',
    targetRecordId: r.target_record_id ?? ''
  })),
  assignees: (t.assignees ?? []).map((a: any) => ({
    referencedActorType: a.referenced_actor_type ?? '',
    referencedActorId: a.referenced_actor_id ?? ''
  })),
  createdAt: t.created_at ?? ''
});

export let listTasksTool = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks with optional filters for assignee, completion status, and linked records. Returns task content, deadlines, assignees, and linked records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      linkedObject: z.string().optional().describe('Filter by linked object slug'),
      linkedRecordId: z.string().optional().describe('Filter by linked record ID'),
      assignee: z
        .string()
        .optional()
        .describe('Filter by assignee (email, workspace member ID, or null for unassigned)'),
      isCompleted: z.boolean().optional().describe('Filter by completion status'),
      sort: z.enum(['created_at:asc', 'created_at:desc']).optional().describe('Sort order'),
      limit: z.number().optional().default(50).describe('Maximum tasks to return'),
      offset: z.number().optional().default(0).describe('Number of tasks to skip')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema).describe('Tasks'),
      count: z.number().describe('Number of tasks returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let tasks = await client.listTasks({
      linkedObject: ctx.input.linkedObject,
      linkedRecordId: ctx.input.linkedRecordId,
      assignee: ctx.input.assignee,
      isCompleted: ctx.input.isCompleted,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = tasks.map(mapTask);

    return {
      output: { tasks: mapped, count: mapped.length },
      message: `Found **${mapped.length}** task(s).`
    };
  })
  .build();

export let createTaskTool = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in the workspace. Tasks can be assigned to workspace members and linked to records (people, companies, etc.).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      content: z.string().describe('Task description/content'),
      format: z
        .enum(['plaintext', 'markdown'])
        .optional()
        .default('plaintext')
        .describe('Content format'),
      deadlineAt: z.string().optional().describe('Deadline in ISO 8601 format or YYYY-MM-DD'),
      isCompleted: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the task starts as completed'),
      linkedRecords: z
        .array(linkedRecordSchema)
        .optional()
        .describe('Record references to link to this task'),
      assignees: z
        .array(assigneeSchema)
        .optional()
        .describe('Workspace members to assign to this task')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let task = await client.createTask({
      content: ctx.input.content,
      format: ctx.input.format,
      deadlineAt: ctx.input.deadlineAt,
      isCompleted: ctx.input.isCompleted,
      linkedRecords: ctx.input.linkedRecords,
      assignees: ctx.input.assignees
    });

    let output = mapTask(task);

    return {
      output,
      message: `Created task **"${output.contentPlaintext}"**.`
    };
  })
  .build();

export let updateTaskTool = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task's deadline, completion status, linked records, or assignees. Can be used to mark tasks as complete, reassign them, or change deadlines.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('The task ID to update'),
      deadlineAt: z
        .string()
        .optional()
        .nullable()
        .describe('New deadline (ISO 8601 or YYYY-MM-DD), or null to remove'),
      isCompleted: z.boolean().optional().describe('Set completion status'),
      linkedRecords: z.array(linkedRecordSchema).optional().describe('Replace linked records'),
      assignees: z.array(assigneeSchema).optional().describe('Replace assignees')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let task = await client.updateTask(ctx.input.taskId, {
      deadlineAt: ctx.input.deadlineAt,
      isCompleted: ctx.input.isCompleted,
      linkedRecords: ctx.input.linkedRecords,
      assignees: ctx.input.assignees
    });

    let output = mapTask(task);

    return {
      output,
      message: `Updated task **${output.taskId}**${ctx.input.isCompleted !== undefined ? (ctx.input.isCompleted ? ' (marked complete)' : ' (marked incomplete)') : ''}.`
    };
  })
  .build();

export let deleteTaskTool = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('The task ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the task was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });
    await client.deleteTask(ctx.input.taskId);

    return {
      output: { deleted: true },
      message: `Deleted task **${ctx.input.taskId}**.`
    };
  })
  .build();
