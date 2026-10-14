import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let manageTasks = SlateTool.create(spec, {
  name: 'Manage Tasks',
  key: 'manage_tasks',
  description: `Manage Quick Tasks in Connecteam: list task boards, create/update/delete tasks, manage sub-tasks, and view labels. Tasks can be assigned to users with due dates and organized on boards.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_task_boards',
          'list_tasks',
          'create_task',
          'update_task',
          'delete_task',
          'list_labels',
          'list_sub_tasks',
          'create_sub_task',
          'update_sub_task',
          'delete_sub_task'
        ])
        .describe('Task action to perform'),
      taskBoardId: z.number().optional().describe('Task board ID (required for most actions)'),
      taskId: z
        .string()
        .optional()
        .describe('Task ID (for update_task, delete_task, sub-task operations)'),
      subTaskId: z
        .string()
        .optional()
        .describe('Sub-task ID (for update_sub_task, delete_sub_task)'),
      taskBody: z
        .object({
          title: z.string().optional().describe('Task title'),
          description: z.string().optional().describe('Task description'),
          startTime: z.number().optional().describe('Start time as Unix timestamp'),
          dueDate: z.number().optional().describe('Due date as Unix timestamp'),
          status: z
            .enum(['draft', 'published', 'completed'])
            .optional()
            .describe('Task status'),
          userIds: z.array(z.number()).optional().describe('Assigned user IDs'),
          labels: z.array(z.any()).optional().describe('Task labels'),
          labelIds: z.array(z.string()).optional().describe('IDs from the list_labels action'),
          attachments: z.array(z.any()).optional().describe('Task attachments')
        })
        .optional()
        .describe('Task data for create/update'),
      subTaskBody: z.any().optional().describe('Sub-task data for create/update'),
      limit: z.number().optional().describe('Results per page'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      ...ctx.auth,
      baseUrl: ctx.auth.baseUrl ?? (ctx.config as { baseUrl?: string }).baseUrl
    });

    let { action, taskBoardId, taskId, subTaskId } = ctx.input;
    let taskBody: Record<string, unknown> | undefined;
    if (action === 'create_task' || action === 'update_task') {
      let input = ctx.input.taskBody;
      if (!input?.title || input.status === undefined || input.userIds === undefined) {
        throw createApiServiceError(
          'taskBody.title, taskBody.status, and taskBody.userIds are required for task creation and updates.'
        );
      }
      if (input.userIds.length === 0 && input.status !== 'draft') {
        throw createApiServiceError('Tasks without assigned users must have draft status.');
      }
      let { description, attachments, labels, labelIds, ...fields } = input;
      let legacyLabelIds = labels?.map(label =>
        typeof label === 'string' ? label : label?.id
      );
      if (legacyLabelIds?.some(id => typeof id !== 'string')) {
        throw createApiServiceError(
          'Use labelIds, or labels containing string IDs or objects with a string id.'
        );
      }
      if (attachments?.some(attachment => typeof attachment?.fileId !== 'string')) {
        throw createApiServiceError(
          'Each task attachment must contain a pre-uploaded fileId.'
        );
      }
      taskBody = {
        ...fields,
        ...(labelIds || legacyLabelIds ? { labelIds: labelIds ?? legacyLabelIds } : {}),
        ...(description !== undefined || attachments !== undefined
          ? { description: { content: description ?? '', attachments } }
          : {})
      };
    }

    if (action === 'list_task_boards') {
      let result = await client.getTaskBoards();
      return {
        output: { result },
        message: `Retrieved task boards.`
      };
    }

    if (!taskBoardId) throw createApiServiceError('taskBoardId is required for this action.');

    if (action === 'list_tasks') {
      let result = await client.getTasks(taskBoardId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved tasks from board **${taskBoardId}**.`
      };
    }

    if (action === 'create_task') {
      let result = await client.createTask(taskBoardId, taskBody);
      return {
        output: { result },
        message: `Created task on board **${taskBoardId}**.`
      };
    }

    if (action === 'update_task') {
      if (!taskId) throw createApiServiceError('taskId is required.');
      let result = await client.updateTask(taskBoardId, taskId, taskBody);
      return {
        output: { result },
        message: `Updated task **${taskId}** on board **${taskBoardId}**.`
      };
    }

    if (action === 'delete_task') {
      if (!taskId) throw createApiServiceError('taskId is required.');
      let result = await client.deleteTask(taskBoardId, taskId);
      return {
        output: { result },
        message: `Deleted task **${taskId}** from board **${taskBoardId}**.`
      };
    }

    if (action === 'list_labels') {
      let result = await client.getTaskLabels(taskBoardId);
      return {
        output: { result },
        message: `Retrieved labels for board **${taskBoardId}**.`
      };
    }

    if (action === 'list_sub_tasks') {
      if (!taskId) throw createApiServiceError('taskId is required.');
      let result = await client.getSubTasks(taskBoardId, taskId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved sub-tasks for task **${taskId}**.`
      };
    }

    if (action === 'create_sub_task') {
      if (!taskId) throw createApiServiceError('taskId is required.');
      if (typeof ctx.input.subTaskBody?.title !== 'string' || !ctx.input.subTaskBody.title) {
        throw createApiServiceError('subTaskBody.title is required for create_sub_task.');
      }
      let result = await client.createSubTask(taskBoardId, taskId, ctx.input.subTaskBody);
      return {
        output: { result },
        message: `Created sub-task for task **${taskId}**.`
      };
    }

    if (action === 'update_sub_task') {
      if (!taskId) throw createApiServiceError('taskId is required.');
      if (!subTaskId) throw createApiServiceError('subTaskId is required.');
      if (
        !ctx.input.subTaskBody ||
        typeof ctx.input.subTaskBody !== 'object' ||
        Array.isArray(ctx.input.subTaskBody)
      ) {
        throw createApiServiceError('Provide a subTaskBody object for update_sub_task.');
      }
      let result = await client.updateSubTask(
        taskBoardId,
        taskId,
        subTaskId,
        ctx.input.subTaskBody
      );
      return {
        output: { result },
        message: `Updated sub-task **${subTaskId}**.`
      };
    }

    if (action === 'delete_sub_task') {
      if (!taskId) throw createApiServiceError('taskId is required.');
      if (!subTaskId) throw createApiServiceError('subTaskId is required.');
      let result = await client.deleteSubTask(taskBoardId, taskId, subTaskId);
      return {
        output: { result },
        message: `Deleted sub-task **${subTaskId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
