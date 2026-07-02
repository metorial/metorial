import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTodoListTool = SlateTool.create(spec, {
  name: 'Manage To-Do List',
  key: 'manage_todo_list',
  description: `Create or update a to-do list within a Basecamp project. To-do lists are containers for individual to-do items.
To **create**, provide the \`projectId\`, \`todoSetId\`, and \`name\`.
To **update**, provide the \`projectId\`, \`todoListId\`, and the new \`name\`.`,
  instructions: [
    'Use Get Project to find the todoset ID from the project dock (look for the "todoset" dock item).'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project (bucket)'),
      action: z.enum(['create', 'update']).describe('Action to perform'),
      todoSetId: z
        .string()
        .optional()
        .describe('ID of the to-do set (required for create, found in project dock)'),
      todoListId: z.string().optional().describe('ID of the to-do list (required for update)'),
      name: z.string().describe('Name of the to-do list'),
      description: z
        .string()
        .optional()
        .describe('Description of the to-do list (supports HTML)')
    })
  )
  .output(
    z.object({
      todoListId: z.number().describe('ID of the to-do list'),
      name: z.string().describe('Name of the to-do list'),
      description: z.string().nullable().describe('Description of the to-do list'),
      completedCount: z.number().describe('Number of completed to-dos'),
      incompletedCount: z.number().describe('Number of incomplete to-dos')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let { action, projectId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.todoSetId)
        throw new Error('todoSetId is required for creating a to-do list');

      let list = await client.createTodoList(projectId, ctx.input.todoSetId, {
        name: ctx.input.name,
        description: ctx.input.description
      });

      return {
        output: {
          todoListId: list.id,
          name: list.name,
          description: list.description ?? null,
          completedCount: list.completed_ratio?.split('/')[0]
            ? Number(list.completed_ratio.split('/')[0])
            : 0,
          incompletedCount: 0
        },
        message: `Created to-do list **${list.name}**.`
      };
    }

    // update
    if (!ctx.input.todoListId)
      throw new Error('todoListId is required for updating a to-do list');

    let list = await client.updateTodoList(projectId, ctx.input.todoListId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        todoListId: list.id,
        name: list.name,
        description: list.description ?? null,
        completedCount: list.completed_ratio?.split('/')[0]
          ? Number(list.completed_ratio.split('/')[0])
          : 0,
        incompletedCount: list.completed_ratio?.split('/')[1]
          ? Number(list.completed_ratio.split('/')[1])
          : 0
      },
      message: `Updated to-do list **${list.name}**.`
    };
  })
  .build();
