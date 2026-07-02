import { SlateTool } from 'slates';
import { z } from 'zod';
import { CmpClient } from '../lib/cmp-client';
import { spec } from '../spec';

export let manageCmpTask = SlateTool.create(spec, {
  name: 'Manage CMP Task',
  key: 'manage_cmp_task',
  description: `Create, update, retrieve, delete, or list tasks in Optimizely Content Marketing Platform.
Tasks represent content work items that move through workflow stages. Use this to manage the full lifecycle of content tasks including commenting.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'delete', 'list', 'add_comment', 'list_comments'])
        .describe('Action to perform'),
      taskId: z
        .string()
        .optional()
        .describe('Task ID (required for get, update, delete, add_comment, list_comments)'),
      name: z.string().optional().describe('Task name (for create/update)'),
      description: z.string().optional().describe('Task description (for create/update)'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign to associate the task with (for create)'),
      assigneeId: z.string().optional().describe('User ID to assign (for create/update)'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date in ISO 8601 format (for create/update)'),
      workflowId: z.string().optional().describe('Workflow ID (for create)'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values (for create/update)'),
      commentBody: z.string().optional().describe('Comment text (for add_comment)'),
      status: z.string().optional().describe('Filter by status (for list)'),
      page: z.number().optional().describe('Page number (for list)'),
      limit: z.number().optional().describe('Items per page (for list)')
    })
  )
  .output(
    z.object({
      task: z.any().optional().describe('Task data'),
      tasks: z.array(z.any()).optional().describe('List of tasks'),
      comment: z.any().optional().describe('Comment data'),
      comments: z.array(z.any()).optional().describe('List of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CmpClient(ctx.auth.token);

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listTasks({
          page: ctx.input.page,
          limit: ctx.input.limit,
          status: ctx.input.status
        });
        let tasks = result.data || result;
        return {
          output: { tasks: Array.isArray(tasks) ? tasks : [] },
          message: `Listed CMP tasks.`
        };
      }
      case 'get': {
        if (!ctx.input.taskId) throw new Error('taskId is required');
        let task = await client.getTask(ctx.input.taskId);
        return {
          output: { task },
          message: `Retrieved CMP task **${task.name || ctx.input.taskId}**.`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required');
        let task = await client.createTask({
          name: ctx.input.name,
          description: ctx.input.description,
          campaign_id: ctx.input.campaignId,
          assignee_id: ctx.input.assigneeId,
          due_date: ctx.input.dueDate,
          workflow_id: ctx.input.workflowId,
          custom_fields: ctx.input.customFields
        });
        return {
          output: { task },
          message: `Created CMP task **${task.name}**.`
        };
      }
      case 'update': {
        if (!ctx.input.taskId) throw new Error('taskId is required');
        let updateData: Record<string, any> = {};
        if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
        if (ctx.input.description !== undefined)
          updateData.description = ctx.input.description;
        if (ctx.input.assigneeId !== undefined) updateData.assignee_id = ctx.input.assigneeId;
        if (ctx.input.dueDate !== undefined) updateData.due_date = ctx.input.dueDate;
        if (ctx.input.customFields !== undefined)
          updateData.custom_fields = ctx.input.customFields;
        let task = await client.updateTask(ctx.input.taskId, updateData);
        return {
          output: { task },
          message: `Updated CMP task **${task.name || ctx.input.taskId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.taskId) throw new Error('taskId is required');
        await client.deleteTask(ctx.input.taskId);
        return {
          output: {},
          message: `Deleted CMP task ${ctx.input.taskId}.`
        };
      }
      case 'add_comment': {
        if (!ctx.input.taskId) throw new Error('taskId is required');
        if (!ctx.input.commentBody) throw new Error('commentBody is required');
        let comment = await client.createTaskComment(ctx.input.taskId, {
          body: ctx.input.commentBody
        });
        return {
          output: { comment },
          message: `Added comment to CMP task ${ctx.input.taskId}.`
        };
      }
      case 'list_comments': {
        if (!ctx.input.taskId) throw new Error('taskId is required');
        let result = await client.listTaskComments(ctx.input.taskId);
        let comments = result.data || result;
        return {
          output: { comments: Array.isArray(comments) ? comments : [] },
          message: `Listed comments for CMP task ${ctx.input.taskId}.`
        };
      }
    }
  })
  .build();
