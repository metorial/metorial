import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { positiveIntegerSchema } from '../lib/schemas';
import { spec } from '../spec';

let columnSchema = z.object({
  columnId: z.number().describe('Column ID'),
  name: z.string().describe('Column name'),
  position: z.number().describe('Column position on the board'),
  sortorder: z.string().nullable().describe('Sort order within the column')
});

export let listColumns = SlateTool.create(spec, {
  name: 'List Columns',
  key: 'list_columns',
  description: `List built-in and custom Kanban board columns for a BugHerd project, including their IDs, names, and positions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: positiveIntegerSchema.describe('Project ID to list columns for')
    })
  )
  .output(
    z.object({
      columns: z.array(columnSchema).describe('Columns on the project board')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let rawColumns = await client.listColumns(ctx.input.projectId);

    let columns = rawColumns.map(c => ({
      columnId: c.id,
      name: c.name,
      position: c.position,
      sortorder: c.sortorder ?? null
    }));

    return {
      output: { columns },
      message: `Found **${columns.length}** column(s) in project ${ctx.input.projectId}.`
    };
  })
  .build();

export let createColumn = SlateTool.create(spec, {
  name: 'Create Column',
  key: 'create_column',
  description: `Add a new custom column to a BugHerd project's Kanban board. Custom columns extend the default workflow (backlog, todo, doing, done, closed).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('Project ID'),
      name: z.string().describe('Name for the new column')
    })
  )
  .output(
    z.object({
      columnId: z.number().describe('Created column ID'),
      name: z.string().describe('Column name'),
      position: z.number().describe('Column position')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let column = await client.createColumn(ctx.input.projectId, ctx.input.name);

    return {
      output: {
        columnId: column.id,
        name: column.name,
        position: column.position
      },
      message: `Created column **${column.name}** in project ${ctx.input.projectId}.`
    };
  })
  .build();

export let updateColumn = SlateTool.create(spec, {
  name: 'Update Column',
  key: 'update_column',
  description: `Rename an existing custom column on a BugHerd project's Kanban board.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('Project ID'),
      columnId: z.number().describe('Column ID to update'),
      name: z.string().describe('New column name')
    })
  )
  .output(
    z.object({
      columnId: z.number().describe('Updated column ID'),
      name: z.string().describe('Updated column name'),
      position: z.number().describe('Column position')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let column = await client.updateColumn(
      ctx.input.projectId,
      ctx.input.columnId,
      ctx.input.name
    );

    return {
      output: {
        columnId: column.id,
        name: column.name,
        position: column.position
      },
      message: `Renamed column to **${column.name}** in project ${ctx.input.projectId}.`
    };
  })
  .build();
