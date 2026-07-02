import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let todoSchema = z.object({
  todoId: z.number().describe('Unique identifier of the to-do'),
  content: z.string().describe('Title/content of the to-do'),
  description: z.string().nullable().describe('Detailed description'),
  completed: z.boolean().describe('Whether the to-do is completed'),
  status: z.string().describe('Recording status (active, archived, trashed)'),
  dueOn: z.string().nullable().describe('Due date'),
  startsOn: z.string().nullable().describe('Start date'),
  createdAt: z.string().describe('When the to-do was created'),
  updatedAt: z.string().describe('When the to-do was last updated'),
  assignees: z
    .array(
      z.object({
        personId: z.number().describe('Person ID'),
        name: z.string().describe('Person name')
      })
    )
    .describe('People assigned to this to-do')
});

export let listTodosTool = SlateTool.create(spec, {
  name: 'List To-Dos',
  key: 'list_todos',
  description: `List to-do items from a specific to-do list within a Basecamp project. By default returns active, pending to-dos. Use \`completed: true\` to see completed items.`,
  instructions: [
    'Use the Get Project tool to find the todoset ID, then List To-Do Lists to find the todoListId.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project (bucket)'),
      todoListId: z.string().describe('ID of the to-do list'),
      completed: z.boolean().optional().describe('Set to true to list completed to-dos')
    })
  )
  .output(
    z.object({
      todos: z.array(todoSchema).describe('List of to-dos')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let todos = await client.listTodos(ctx.input.projectId, ctx.input.todoListId, {
      completed: ctx.input.completed
    });

    let mapped = todos.map((t: any) => ({
      todoId: t.id,
      content: t.content,
      description: t.description ?? null,
      completed: t.completed ?? false,
      status: t.status,
      dueOn: t.due_on ?? null,
      startsOn: t.starts_on ?? null,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      assignees: (t.assignees || []).map((a: any) => ({
        personId: a.id,
        name: a.name
      }))
    }));

    return {
      output: { todos: mapped },
      message: `Found **${mapped.length}** to-do(s) in the list.`
    };
  })
  .build();
