import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

let columnSchema = z.object({
  columnId: z.string().describe('Column ID'),
  title: z.string().describe('Column title'),
  type: z.string().describe('Column type'),
  description: z.string().nullable().describe('Column description'),
  settings: z.string().nullable().describe('Column settings as JSON string')
});

export let listColumnsTool = SlateTool.create(spec, {
  name: 'List Columns',
  key: 'list_columns',
  description: `Retrieve all columns (fields) defined on a board. Returns column metadata including type, title, and settings.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID to list columns from')
    })
  )
  .output(
    z.object({
      columns: z.array(columnSchema).describe('List of columns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let columns = await client.getColumns(ctx.input.boardId);

    let mapped = columns.map((c: any) => ({
      columnId: c.id,
      title: c.title,
      type: c.type,
      description: c.description || null,
      settings: c.settings_str || null
    }));

    return {
      output: { columns: mapped },
      message: `Found **${mapped.length}** column(s) on board ${ctx.input.boardId}.`
    };
  })
  .build();

export let createColumnTool = SlateTool.create(spec, {
  name: 'Create Column',
  key: 'create_column',
  description: `Add a new column to a board. Specify the column type using Monday.com's column type identifiers (e.g., status, text, numbers, date, people, dropdown, checkbox, email, phone, timeline, etc.).`,
  instructions: [
    'Common column types: status, text, numbers, date, people, dropdown, checkbox, email, phone, timeline, long_text, link, color_picker, rating, tags, week, hour, formula, auto_number, file, location, country, mirror'
  ]
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID to add the column to'),
      title: z.string().describe('Column title'),
      columnType: z
        .string()
        .describe('Monday.com column type identifier (e.g., status, text, numbers, date)'),
      description: z.string().optional().describe('Column description'),
      defaults: z
        .string()
        .optional()
        .describe('JSON string of default settings for the column')
    })
  )
  .output(
    z.object({
      columnId: z.string().describe('ID of the created column'),
      title: z.string().describe('Column title'),
      type: z.string().describe('Column type'),
      description: z.string().nullable().describe('Column description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    let column = await client.createColumn(
      ctx.input.boardId,
      ctx.input.title,
      ctx.input.columnType,
      {
        description: ctx.input.description,
        defaults: ctx.input.defaults
      }
    );

    return {
      output: {
        columnId: column.id,
        title: column.title,
        type: column.type,
        description: column.description || null
      },
      message: `Created column **${column.title}** (type: ${column.type}) on board ${ctx.input.boardId}.`
    };
  })
  .build();
