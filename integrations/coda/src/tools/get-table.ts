import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTableTool = SlateTool.create(spec, {
  name: 'Get Table',
  key: 'get_table',
  description: `Retrieve metadata for a table or view in a Coda doc, including table type, row count, layout, display column, parent page, and view parent table.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      tableIdOrName: z.string().describe('ID or name of the table or view to retrieve')
    })
  )
  .output(
    z.object({
      tableId: z.string().describe('ID of the table or view'),
      name: z.string().describe('Name of the table or view'),
      tableType: z.string().optional().describe('Type of table, such as table or view'),
      rowCount: z.number().optional().describe('Number of rows in the table or view'),
      layout: z.string().optional().describe('Table layout'),
      parentPageId: z.string().optional().describe('ID of the parent page'),
      parentTableId: z.string().optional().describe('ID of the base table for a view'),
      displayColumnId: z.string().optional().describe('ID of the display column'),
      browserLink: z.string().optional().describe('URL to open the table or view')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let table = await client.getTable(ctx.input.docId, ctx.input.tableIdOrName);

    return {
      output: {
        tableId: table.id,
        name: table.name,
        tableType: table.tableType,
        rowCount: table.rowCount,
        layout: table.layout,
        parentPageId: table.parent?.id,
        parentTableId: table.parentTable?.id,
        displayColumnId: table.displayColumn?.id,
        browserLink: table.browserLink
      },
      message: `Retrieved table **${table.name}** (${table.id}).`
    };
  })
  .build();
