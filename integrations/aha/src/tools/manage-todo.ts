import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

let todoOutputSchema = z.object({
  todoId: z.string().describe('To-do ID'),
  name: z.string().optional().describe('To-do name'),
  body: z.string().optional().describe('To-do body'),
  dueDate: z.string().optional().describe('Due date'),
  completed: z.boolean().optional().describe('Whether the to-do is completed'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let manageTodo = SlateTool.create(spec, {
  name: 'Manage To-Do',
  key: 'manage_todo',
  description: `Create, update, list, or delete to-dos on Aha! records. To-dos can be associated with features, releases, requirements, epics, and ideas. They support assignees, due dates, and completion status.`,
  instructions: [
    'To **create** a to-do, set action to "create" and provide recordType, recordId, and name.',
    'To **list** to-dos, set action to "list" and provide recordType and recordId.',
    'To **update** a to-do, set action to "update" and provide todoId plus the fields to change.',
    'To **delete** a to-do, set action to "delete" and provide todoId.',
    'Valid **recordType** values: features, releases, requirements, epics, ideas.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'update', 'delete']).describe('Action to perform'),
      recordType: z
        .enum(['features', 'releases', 'requirements', 'epics', 'ideas'])
        .optional()
        .describe('Type of parent record (required for create/list)'),
      recordId: z
        .string()
        .optional()
        .describe('Parent record ID or reference number (required for create/list)'),
      todoId: z.string().optional().describe('To-do ID (required for update/delete)'),
      name: z.string().optional().describe('To-do name (required for create)'),
      body: z.string().optional().describe('To-do body/description'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      completed: z.boolean().optional().describe('Mark as completed (for update)'),
      assigneeIds: z.array(z.string()).optional().describe('User IDs to assign (for create)'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Records per page for listing')
    })
  )
  .output(
    z.object({
      todo: todoOutputSchema.optional().describe('Single to-do (for create/update)'),
      todos: z.array(todoOutputSchema).optional().describe('List of to-dos (for list action)'),
      totalRecords: z.number().optional().describe('Total to-dos (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      if (!ctx.input.recordType || !ctx.input.recordId) {
        throw new Error('recordType and recordId are required to list to-dos');
      }

      let result = await client.listTodos(ctx.input.recordType, ctx.input.recordId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });

      let todos = result.todos.map(t => ({
        todoId: t.id,
        name: t.name,
        body: t.body,
        dueDate: t.due_date,
        completed: t.completed,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      }));

      return {
        output: {
          todos,
          totalRecords: result.pagination.total_records
        },
        message: `Found **${result.pagination.total_records}** to-dos on ${ctx.input.recordType}/${ctx.input.recordId}.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.recordType || !ctx.input.recordId) {
        throw new Error('recordType and recordId are required to create a to-do');
      }
      if (!ctx.input.name) throw new Error('name is required to create a to-do');

      let todo = await client.createTodo(ctx.input.recordType, ctx.input.recordId, {
        name: ctx.input.name,
        body: ctx.input.body,
        dueDate: ctx.input.dueDate,
        assignees: ctx.input.assigneeIds
      });

      return {
        output: {
          todo: {
            todoId: todo.id,
            name: todo.name,
            body: todo.body,
            dueDate: todo.due_date,
            completed: todo.completed,
            createdAt: todo.created_at,
            updatedAt: todo.updated_at
          }
        },
        message: `Created to-do "${ctx.input.name}" on ${ctx.input.recordType}/${ctx.input.recordId}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.todoId) throw new Error('todoId is required to update a to-do');

      let todo = await client.updateTodo(ctx.input.todoId, {
        name: ctx.input.name,
        body: ctx.input.body,
        dueDate: ctx.input.dueDate,
        completed: ctx.input.completed
      });

      return {
        output: {
          todo: {
            todoId: todo.id,
            name: todo.name,
            body: todo.body,
            dueDate: todo.due_date,
            completed: todo.completed,
            createdAt: todo.created_at,
            updatedAt: todo.updated_at
          }
        },
        message: `Updated to-do \`${ctx.input.todoId}\`${ctx.input.completed ? ' (marked complete)' : ''}.`
      };
    }

    // delete
    if (!ctx.input.todoId) throw new Error('todoId is required to delete a to-do');
    await client.deleteTodo(ctx.input.todoId);
    return {
      output: {},
      message: `Deleted to-do \`${ctx.input.todoId}\`.`
    };
  })
  .build();
