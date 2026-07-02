import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRows = SlateTool.create(spec, {
  name: 'Update Rows',
  key: 'update_rows',
  description: `Update one or more existing rows in a Baserow table. For a single row, provide the row ID and fields to update. For multiple rows, provide an array of row objects each containing an \`id\` field. Only the specified fields will be modified; other fields remain unchanged.`,
  instructions: [
    'For a single update, use `rowId` and `fields`. For batch updates, use `rows` (each must include `id`).',
    'Only include fields you want to change — unspecified fields are left as-is (PATCH semantics).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableId: z.number().describe('The ID of the table containing the rows'),
      rowId: z
        .number()
        .optional()
        .describe('ID of a single row to update (use this OR rows, not both)'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field values to update for a single row'),
      rows: z
        .array(
          z
            .object({
              id: z.number().describe('Row ID')
            })
            .catchall(z.any())
        )
        .optional()
        .describe(
          'Array of row objects each with an `id` and field values to update (batch mode)'
        ),
      userFieldNames: z
        .boolean()
        .optional()
        .default(true)
        .describe('Use human-readable field names instead of field IDs')
    })
  )
  .output(
    z.object({
      updatedRows: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of updated row objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      baseUrl: ctx.config.baseUrl
    });

    let updatedRows: any[];

    if (ctx.input.rows && ctx.input.rows.length > 0) {
      updatedRows = await client.batchUpdateRows({
        tableId: ctx.input.tableId,
        rows: ctx.input.rows as { id: number; [key: string]: any }[],
        userFieldNames: ctx.input.userFieldNames
      });
    } else if (ctx.input.rowId && ctx.input.fields) {
      let updated = await client.updateRow({
        tableId: ctx.input.tableId,
        rowId: ctx.input.rowId,
        data: ctx.input.fields,
        userFieldNames: ctx.input.userFieldNames
      });
      updatedRows = [updated];
    } else {
      throw new Error(
        'Provide either `rowId` + `fields` for a single update, or `rows` for batch update.'
      );
    }

    return {
      output: { updatedRows },
      message: `Updated **${updatedRows.length}** row(s) in table ${ctx.input.tableId}.`
    };
  })
  .build();
