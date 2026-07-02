import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRows = SlateTool.create(spec, {
  name: 'Create Rows',
  key: 'create_rows',
  description: `Create one or more new rows in a Baserow table. Provide field values as key-value pairs. Automatically uses single or batch creation based on the number of rows.`,
  instructions: [
    'Field keys should match your table column names when using `userFieldNames: true`.',
    'For link-to-table fields, provide an array of row IDs from the linked table.',
    'For single/multiple select fields, provide the option value as a string or array of strings.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableId: z.number().describe('The ID of the table to create rows in'),
      rows: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .describe('Array of row objects with field name/ID to value mappings'),
      userFieldNames: z
        .boolean()
        .optional()
        .default(true)
        .describe('Use human-readable field names instead of field IDs')
    })
  )
  .output(
    z.object({
      createdRows: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of created row objects with their assigned IDs and field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      baseUrl: ctx.config.baseUrl
    });

    let createdRows = await client.createRows({
      tableId: ctx.input.tableId,
      rows: ctx.input.rows,
      userFieldNames: ctx.input.userFieldNames
    });

    return {
      output: { createdRows },
      message: `Created **${createdRows.length}** row(s) in table ${ctx.input.tableId}.`
    };
  })
  .build();
