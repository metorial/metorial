import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let columnOutputSchema = z.object({
  columnId: z.number().describe('Column ID'),
  title: z.string().describe('Column title'),
  type: z.string().describe('Column type'),
  primary: z.boolean().optional().describe('Whether this is the primary column'),
  index: z.number().optional().describe('Column position index'),
  options: z.array(z.string()).optional().describe('Picklist options'),
  width: z.number().optional().describe('Column width in pixels')
});

export let manageColumns = SlateTool.create(spec, {
  name: 'Manage Columns',
  key: 'manage_columns',
  description: `Add, update, or delete columns on a sheet. Use the **action** field to specify the operation. When adding columns, provide column definitions. When updating, provide the column ID and fields to change. When deleting, provide the column ID.`,
  instructions: [
    'Column types: TEXT_NUMBER, DATE, DATETIME, CONTACT_LIST, CHECKBOX, PICKLIST, DURATION, PREDECESSOR, ABSTRACT_DATETIME.',
    'The primary column cannot be deleted. Only one primary column is allowed per sheet.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sheetId: z.string().describe('ID of the sheet'),
      action: z.enum(['add', 'update', 'delete']).describe('Action to perform on columns'),
      columns: z
        .array(
          z.object({
            columnId: z
              .string()
              .optional()
              .describe('Column ID (required for update and delete)'),
            title: z.string().optional().describe('Column title (required for add)'),
            type: z.string().optional().describe('Column type (required for add)'),
            index: z.number().optional().describe('Column position index'),
            primary: z.boolean().optional().describe('Whether this is the primary column'),
            options: z
              .array(z.string())
              .optional()
              .describe('Options for PICKLIST or CONTACT_LIST columns'),
            width: z.number().optional().describe('Column width in pixels'),
            formula: z.string().optional().describe('Column-level formula')
          })
        )
        .describe('Column definitions or updates')
    })
  )
  .output(
    z.object({
      columns: z.array(columnOutputSchema).describe('Resulting columns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    if (ctx.input.action === 'add') {
      let result = await client.addColumns(
        ctx.input.sheetId,
        ctx.input.columns.map(c => ({
          title: c.title!,
          type: c.type!,
          index: c.index,
          primary: c.primary,
          options: c.options,
          width: c.width,
          formula: c.formula
        }))
      );

      let columns = (result.result || []).map((c: any) => ({
        columnId: c.id,
        title: c.title,
        type: c.type,
        primary: c.primary,
        index: c.index,
        options: c.options,
        width: c.width
      }));

      return {
        output: { columns },
        message: `Added **${columns.length}** column(s).`
      };
    }

    if (ctx.input.action === 'update') {
      let results: any[] = [];
      for (let col of ctx.input.columns) {
        if (!col.columnId) continue;
        let result = await client.updateColumn(ctx.input.sheetId, col.columnId, {
          title: col.title,
          type: col.type,
          index: col.index,
          options: col.options,
          width: col.width,
          formula: col.formula
        });
        let updated = result.result || result;
        results.push({
          columnId: updated.id,
          title: updated.title,
          type: updated.type,
          primary: updated.primary,
          index: updated.index,
          options: updated.options,
          width: updated.width
        });
      }

      return {
        output: { columns: results },
        message: `Updated **${results.length}** column(s).`
      };
    }

    // delete
    let deleted: any[] = [];
    for (let col of ctx.input.columns) {
      if (!col.columnId) continue;
      await client.deleteColumn(ctx.input.sheetId, col.columnId);
      deleted.push({
        columnId: Number(col.columnId),
        title: col.title || 'Deleted',
        type: col.type || 'unknown'
      });
    }

    return {
      output: { columns: deleted },
      message: `Deleted **${deleted.length}** column(s).`
    };
  })
  .build();
