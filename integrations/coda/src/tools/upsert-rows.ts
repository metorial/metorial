import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let upsertRowsTool = SlateTool.create(spec, {
  name: 'Upsert Rows',
  key: 'upsert_rows',
  description: `Insert or upsert one or more rows into a Coda table. When **keyColumns** are provided, existing rows matching the key values are updated instead of creating duplicates. Each row is specified as an array of column-value cell pairs.`,
  instructions: [
    'Each cell must specify a **column** (ID or name) and a **value**.',
    'Provide **keyColumns** to enable upsert behavior — rows matching on these columns will be updated rather than inserted.'
  ],
  constraints: [
    'Only works on base tables, not views.',
    'Write operations are asynchronous and return HTTP 202.',
    'Maximum request size is 2 MB; maximum 85 KB per row.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      tableIdOrName: z.string().describe('ID or name of the table'),
      rows: z
        .array(
          z.object({
            cells: z
              .array(
                z.object({
                  column: z.string().describe('Column ID or name'),
                  value: z.any().describe('Value for the cell')
                })
              )
              .describe('Cell values for the row')
          })
        )
        .describe('Array of rows to insert or upsert'),
      keyColumns: z
        .array(z.string())
        .optional()
        .describe('Column IDs or names to match on for upsert behavior'),
      disableParsing: z
        .boolean()
        .optional()
        .describe('If true, preserve values exactly instead of letting Coda parse strings')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID to track the asynchronous mutation status'),
      addedRowIds: z.array(z.string()).optional().describe('IDs of newly added rows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.upsertRows(
      ctx.input.docId,
      ctx.input.tableIdOrName,
      {
        rows: ctx.input.rows,
        keyColumns: ctx.input.keyColumns
      },
      {
        disableParsing: ctx.input.disableParsing
      }
    );

    return {
      output: {
        requestId: result.requestId,
        addedRowIds: result.addedRowIds
      },
      message: `${ctx.input.keyColumns ? 'Upserted' : 'Inserted'} **${ctx.input.rows.length}** row(s) into table **${ctx.input.tableIdOrName}**. Request ID: ${result.requestId}`
    };
  })
  .build();
