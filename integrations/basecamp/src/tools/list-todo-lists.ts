import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let todoListSchema = z.object({
  todoListId: z.number().describe('Unique identifier of the to-do list'),
  name: z.string().describe('Name of the to-do list'),
  description: z.string().nullable().describe('Description of the to-do list'),
  status: z.string().describe('Status (active, archived, trashed)'),
  completedRatio: z.string().nullable().describe('Completed/total ratio string'),
  createdAt: z.string().describe('When the to-do list was created'),
  updatedAt: z.string().describe('When the to-do list was last updated')
});

export let listTodoListsTool = SlateTool.create(spec, {
  name: 'List To-Do Lists',
  key: 'list_todo_lists',
  description: `List all to-do lists within a project's to-do set. Returns active lists by default.`,
  instructions: [
    'Use Get Project to find the todoset ID from the project dock (look for the "todoset" dock item).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project (bucket)'),
      todoSetId: z.string().describe('ID of the to-do set (found in project dock)'),
      status: z
        .enum(['active', 'archived', 'trashed'])
        .optional()
        .default('active')
        .describe('Filter lists by status')
    })
  )
  .output(
    z.object({
      todoLists: z.array(todoListSchema).describe('List of to-do lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let statusParam = ctx.input.status === 'active' ? undefined : ctx.input.status;
    let lists = await client.listTodoLists(ctx.input.projectId, ctx.input.todoSetId, {
      status: statusParam
    });

    let mapped = lists.map((l: any) => ({
      todoListId: l.id,
      name: l.name,
      description: l.description ?? null,
      status: l.status,
      completedRatio: l.completed_ratio ?? null,
      createdAt: l.created_at,
      updatedAt: l.updated_at
    }));

    return {
      output: { todoLists: mapped },
      message: `Found **${mapped.length}** to-do list(s).`
    };
  })
  .build();
