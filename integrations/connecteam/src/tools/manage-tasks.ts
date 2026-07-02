import { SlateTool } from 'slates';
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
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { action, taskBoardId, taskId, subTaskId } = ctx.input;

    if (action === 'list_task_boards') {
      let result = await client.getTaskBoards();
      return {
        output: { result },
        message: `Retrieved task boards.`
      };
    }

    if (!taskBoardId) throw new Error('taskBoardId is required for this action.');

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
      let result = await client.createTask(taskBoardId, ctx.input.taskBody);
      return {
        output: { result },
        message: `Created task on board **${taskBoardId}**.`
      };
    }

    if (action === 'update_task') {
      if (!taskId) throw new Error('taskId is required.');
      let result = await client.updateTask(taskBoardId, taskId, ctx.input.taskBody);
      return {
        output: { result },
        message: `Updated task **${taskId}** on board **${taskBoardId}**.`
      };
    }

    if (action === 'delete_task') {
      if (!taskId) throw new Error('taskId is required.');
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
      if (!taskId) throw new Error('taskId is required.');
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
      if (!taskId) throw new Error('taskId is required.');
      let result = await client.createSubTask(taskBoardId, taskId, ctx.input.subTaskBody);
      return {
        output: { result },
        message: `Created sub-task for task **${taskId}**.`
      };
    }

    if (action === 'update_sub_task') {
      if (!taskId) throw new Error('taskId is required.');
      if (!subTaskId) throw new Error('subTaskId is required.');
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
      if (!taskId) throw new Error('taskId is required.');
      if (!subTaskId) throw new Error('subTaskId is required.');
      let result = await client.deleteSubTask(taskBoardId, taskId, subTaskId);
      return {
        output: { result },
        message: `Deleted sub-task **${subTaskId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
