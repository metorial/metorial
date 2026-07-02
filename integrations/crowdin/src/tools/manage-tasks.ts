import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTasksTool = SlateTool.create(spec, {
  name: 'Manage Tasks',
  key: 'manage_tasks',
  description: `List, create, update, or delete translation/proofreading tasks. Tasks assign specific translation work to team members with deadlines and progress tracking.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      taskId: z.number().optional().describe('Task ID (required for get/update/delete)'),
      title: z.string().optional().describe('Task title (required for create)'),
      languageId: z.string().optional().describe('Target language code (required for create)'),
      fileIds: z
        .array(z.number())
        .optional()
        .describe('File IDs to include (required for create)'),
      type: z
        .number()
        .optional()
        .describe('Task type: 0=translate, 1=proofread (required for create)'),
      status: z
        .enum(['todo', 'in_progress', 'done', 'closed'])
        .optional()
        .describe('Task status'),
      taskDescription: z.string().optional().describe('Task description'),
      assigneeIds: z.array(z.number()).optional().describe('User IDs to assign the task to'),
      deadline: z.string().optional().describe('Deadline (ISO 8601 format)'),
      labelIds: z.array(z.number()).optional().describe('Label IDs'),
      limit: z.number().optional(),
      offset: z.number().optional()
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.number(),
            title: z.string(),
            languageId: z.string(),
            type: z.number().optional(),
            status: z.string(),
            fileIds: z.array(z.number()).optional(),
            deadline: z.string().optional(),
            createdAt: z.string().optional(),
            progress: z
              .object({
                total: z.number().optional(),
                done: z.number().optional(),
                percent: z.number().optional()
              })
              .optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional(),
      pagination: z
        .object({
          offset: z.number(),
          limit: z.number()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { projectId, action } = ctx.input;

    if (action === 'list') {
      let result = await client.listTasks(projectId, {
        status: ctx.input.status,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let tasks = result.data.map((item: any) => ({
        taskId: item.data.id,
        title: item.data.title,
        languageId: item.data.languageId,
        type: item.data.type,
        status: item.data.status,
        fileIds: item.data.fileIds || undefined,
        deadline: item.data.deadline || undefined,
        createdAt: item.data.createdAt,
        progress: item.data.progress || undefined
      }));

      return {
        output: { tasks, pagination: result.pagination },
        message: `Found **${tasks.length}** tasks.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.taskId) throw new Error('taskId is required');
      let task = await client.getTask(projectId, ctx.input.taskId);

      return {
        output: {
          tasks: [
            {
              taskId: task.id,
              title: task.title,
              languageId: task.languageId,
              type: task.type,
              status: task.status,
              fileIds: task.fileIds || undefined,
              deadline: task.deadline || undefined,
              createdAt: task.createdAt,
              progress: task.progress || undefined
            }
          ]
        },
        message: `Retrieved task **${task.title}** (ID: ${task.id}, status: ${task.status}).`
      };
    }

    if (action === 'create') {
      if (
        !ctx.input.title ||
        !ctx.input.languageId ||
        !ctx.input.fileIds ||
        ctx.input.type === undefined
      ) {
        throw new Error('title, languageId, fileIds, and type are required');
      }

      let assignees = ctx.input.assigneeIds?.map(id => ({ id }));

      let task = await client.createTask(projectId, {
        title: ctx.input.title,
        languageId: ctx.input.languageId,
        fileIds: ctx.input.fileIds,
        type: ctx.input.type,
        status: ctx.input.status,
        description: ctx.input.taskDescription,
        assignees,
        deadline: ctx.input.deadline,
        labelIds: ctx.input.labelIds
      });

      return {
        output: {
          tasks: [
            {
              taskId: task.id,
              title: task.title,
              languageId: task.languageId,
              type: task.type,
              status: task.status,
              fileIds: task.fileIds || undefined,
              deadline: task.deadline || undefined,
              createdAt: task.createdAt
            }
          ]
        },
        message: `Created task **${task.title}** (ID: ${task.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.taskId) throw new Error('taskId is required');

      let patches: Array<{ op: string; path: string; value: any }> = [];
      if (ctx.input.title !== undefined)
        patches.push({ op: 'replace', path: '/title', value: ctx.input.title });
      if (ctx.input.status !== undefined)
        patches.push({ op: 'replace', path: '/status', value: ctx.input.status });
      if (ctx.input.taskDescription !== undefined)
        patches.push({
          op: 'replace',
          path: '/description',
          value: ctx.input.taskDescription
        });
      if (ctx.input.deadline !== undefined)
        patches.push({ op: 'replace', path: '/deadline', value: ctx.input.deadline });

      let task = await client.updateTask(projectId, ctx.input.taskId, patches);

      return {
        output: {
          tasks: [
            {
              taskId: task.id,
              title: task.title,
              languageId: task.languageId,
              type: task.type,
              status: task.status,
              fileIds: task.fileIds || undefined,
              deadline: task.deadline || undefined,
              createdAt: task.createdAt
            }
          ]
        },
        message: `Updated task **${task.title}** (ID: ${task.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.taskId) throw new Error('taskId is required');
      await client.deleteTask(projectId, ctx.input.taskId);

      return {
        output: { deleted: true },
        message: `Deleted task with ID **${ctx.input.taskId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
