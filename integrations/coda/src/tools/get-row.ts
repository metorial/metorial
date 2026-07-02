import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRowTool = SlateTool.create(spec, {
  name: 'Get Row',
  key: 'get_row',
  description: `Retrieve a single row from a table by its ID or name, including all cell values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      tableIdOrName: z.string().describe('ID or name of the table'),
      rowIdOrName: z.string().describe('ID or name of the row'),
      useColumnNames: z
        .boolean()
        .optional()
        .describe('Use column names as keys instead of IDs'),
      valueFormat: z
        .enum(['simple', 'simpleWithArrays', 'rich'])
        .optional()
        .describe('Format for cell values')
    })
  )
  .output(
    z.object({
      rowId: z.string().describe('ID of the row'),
      name: z.string().optional().describe('Display name of the row'),
      createdAt: z.string().optional().describe('When the row was created'),
      updatedAt: z.string().optional().describe('When the row was last updated'),
      cells: z.record(z.string(), z.any()).describe('Cell values keyed by column ID or name'),
      browserLink: z.string().optional().describe('URL to open the row')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let row = await client.getRow(
      ctx.input.docId,
      ctx.input.tableIdOrName,
      ctx.input.rowIdOrName,
      {
        useColumnNames: ctx.input.useColumnNames,
        valueFormat: ctx.input.valueFormat
      }
    );

    return {
      output: {
        rowId: row.id,
        name: row.name,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        cells: row.values || {},
        browserLink: row.browserLink
      },
      message: `Retrieved row **${row.name || row.id}** from table **${ctx.input.tableIdOrName}**.`
    };
  })
  .build();
