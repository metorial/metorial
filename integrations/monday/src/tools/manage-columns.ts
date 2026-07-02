import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

let columnSchema = z.object({
  columnId: z.string().describe('Column ID'),
  title: z.string().describe('Column title'),
  type: z.string().describe('Column type'),
  description: z.string().nullable().describe('Column description'),
  settings: z.any().nullable().describe('Column settings as JSON'),
  revision: z.string().nullable().describe('Column revision'),
  width: z.number().nullable().describe('Column width'),
  archived: z.boolean().nullable().describe('Whether the column is archived')
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
      settings: c.settings ?? null,
      revision: c.revision || null,
      width: c.width ?? null,
      archived: c.archived ?? null
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
        .any()
        .optional()
        .describe('JSON object or string of default settings for the column'),
      afterColumnId: z
        .string()
        .optional()
        .describe('Column ID after which the new column should be inserted'),
      customColumnId: z
        .string()
        .optional()
        .describe('Optional user-specified column ID, 1-20 lowercase letters/underscores')
    })
  )
  .output(
    z.object({
      columnId: z.string().describe('ID of the created column'),
      title: z.string().describe('Column title'),
      type: z.string().describe('Column type'),
      description: z.string().nullable().describe('Column description'),
      settings: z.any().nullable().describe('Column settings as JSON'),
      revision: z.string().nullable().describe('Column revision')
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
        defaults: ctx.input.defaults,
        afterColumnId: ctx.input.afterColumnId,
        customColumnId: ctx.input.customColumnId
      }
    );

    return {
      output: {
        columnId: column.id,
        title: column.title,
        type: column.type,
        description: column.description || null,
        settings: column.settings ?? null,
        revision: column.revision || null
      },
      message: `Created column **${column.title}** (type: ${column.type}) on board ${ctx.input.boardId}.`
    };
  })
  .build();

export let updateColumnMetadataTool = SlateTool.create(spec, {
  name: 'Update Column Metadata',
  key: 'update_column_metadata',
  description: `Update a column's title or description without changing item values.`
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID containing the column'),
      columnId: z.string().describe('Column ID to update'),
      property: z
        .enum(['title', 'description'])
        .describe('Column metadata property to update'),
      value: z.string().describe('New title or description value')
    })
  )
  .output(columnSchema)
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    let column = await client.changeColumnMetadata(
      ctx.input.boardId,
      ctx.input.columnId,
      ctx.input.property,
      ctx.input.value
    );

    return {
      output: {
        columnId: column.id,
        title: column.title,
        type: column.type,
        description: column.description || null,
        settings: column.settings ?? null,
        revision: column.revision || null,
        width: column.width ?? null,
        archived: column.archived ?? null
      },
      message: `Updated ${ctx.input.property} for column ${ctx.input.columnId}.`
    };
  })
  .build();

export let deleteColumnTool = SlateTool.create(spec, {
  name: 'Delete Column',
  key: 'delete_column',
  description: `Delete a column from a board.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID containing the column'),
      columnId: z.string().describe('Column ID to delete')
    })
  )
  .output(
    z.object({
      columnId: z.string().describe('Deleted column ID'),
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    let column = await client.deleteColumn(ctx.input.boardId, ctx.input.columnId);

    return {
      output: {
        columnId: String(column.id ?? ctx.input.columnId),
        success: true
      },
      message: `Deleted column ${ctx.input.columnId}.`
    };
  })
  .build();
