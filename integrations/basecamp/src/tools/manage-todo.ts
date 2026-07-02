import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTodoTool = SlateTool.create(spec, {
  name: 'Manage To-Do',
  key: 'manage_todo',
  description: `Create, update, complete, or uncomplete a to-do item in a Basecamp project.
To **create** a to-do, provide the \`projectId\`, \`todoListId\`, and \`content\`.
To **update**, **complete**, or **uncomplete** a to-do, provide the \`projectId\` and \`todoId\`.
Supports assigning people, setting due dates, and adding descriptions.`,
  instructions: [
    'Use the Get Project tool first to find the todoset ID from the project dock, then list to-do lists to get the todoListId.',
    'When updating a to-do, omitted fields are left unchanged.'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project (bucket)'),
      action: z
        .enum(['create', 'update', 'complete', 'uncomplete'])
        .describe('Action to perform'),
      todoListId: z.string().optional().describe('ID of the to-do list (required for create)'),
      todoId: z
        .string()
        .optional()
        .describe('ID of the to-do (required for update/complete/uncomplete)'),
      content: z.string().optional().describe('Title/content of the to-do'),
      description: z.string().optional().describe('Detailed description (supports HTML)'),
      assigneeIds: z.array(z.number()).optional().describe('Array of person IDs to assign'),
      dueOn: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      startsOn: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      notify: z.boolean().optional().describe('Whether to notify assignees')
    })
  )
  .output(
    z.object({
      todoId: z.number().nullable().describe('ID of the to-do'),
      content: z.string().nullable().describe('Content/title of the to-do'),
      completed: z.boolean().describe('Whether the to-do is completed'),
      status: z.string().describe('Recording status (active, archived, trashed)'),
      dueOn: z.string().nullable().describe('Due date'),
      startsOn: z.string().nullable().describe('Start date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let { action, projectId, todoListId, todoId } = ctx.input;

    if (action === 'create') {
      if (!todoListId) throw new Error('todoListId is required for creating a to-do');
      if (!ctx.input.content) throw new Error('content is required for creating a to-do');

      let todo = await client.createTodo(projectId, todoListId, {
        content: ctx.input.content,
        description: ctx.input.description,
        assigneeIds: ctx.input.assigneeIds,
        dueOn: ctx.input.dueOn,
        startsOn: ctx.input.startsOn,
        notify: ctx.input.notify
      });

      return {
        output: {
          todoId: todo.id,
          content: todo.content,
          completed: todo.completed ?? false,
          status: todo.status,
          dueOn: todo.due_on ?? null,
          startsOn: todo.starts_on ?? null
        },
        message: `Created to-do **${todo.content}**.`
      };
    }

    if (action === 'complete') {
      if (!todoId) throw new Error('todoId is required for completing a to-do');
      await client.completeTodo(projectId, todoId);
      return {
        output: {
          todoId: Number(todoId),
          content: null,
          completed: true,
          status: 'active',
          dueOn: null,
          startsOn: null
        },
        message: `Marked to-do **${todoId}** as complete.`
      };
    }

    if (action === 'uncomplete') {
      if (!todoId) throw new Error('todoId is required for uncompleting a to-do');
      await client.uncompleteTodo(projectId, todoId);
      return {
        output: {
          todoId: Number(todoId),
          content: null,
          completed: false,
          status: 'active',
          dueOn: null,
          startsOn: null
        },
        message: `Marked to-do **${todoId}** as incomplete.`
      };
    }

    // update
    if (!todoId) throw new Error('todoId is required for updating a to-do');

    let todo = await client.updateTodo(projectId, todoId, {
      content: ctx.input.content,
      description: ctx.input.description,
      assigneeIds: ctx.input.assigneeIds,
      dueOn: ctx.input.dueOn,
      startsOn: ctx.input.startsOn,
      notify: ctx.input.notify
    });

    return {
      output: {
        todoId: todo.id,
        content: todo.content,
        completed: todo.completed ?? false,
        status: todo.status,
        dueOn: todo.due_on ?? null,
        startsOn: todo.starts_on ?? null
      },
      message: `Updated to-do **${todo.content}**.`
    };
  })
  .build();
