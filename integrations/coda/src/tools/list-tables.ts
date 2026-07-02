import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTablesTool = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List all tables and views in a Coda doc, including their column definitions, row counts, and layout types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      sortBy: z.string().optional().describe('Sort order for tables'),
      tableTypes: z
        .string()
        .optional()
        .describe('Comma-separated table types to filter (e.g. "table,view")'),
      limit: z.number().optional().describe('Maximum number of tables to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      tables: z.array(
        z.object({
          tableId: z.string().describe('ID of the table'),
          name: z.string().describe('Name of the table'),
          tableType: z.string().optional().describe('Type of the table (table or view)'),
          rowCount: z.number().optional().describe('Number of rows in the table'),
          browserLink: z.string().optional().describe('URL to open the table'),
          parentTableId: z.string().optional().describe('ID of the parent table (for views)')
        })
      ),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTables(ctx.input.docId, {
      sortBy: ctx.input.sortBy,
      tableTypes: ctx.input.tableTypes,
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken
    });

    let tables = (result.items || []).map((table: any) => ({
      tableId: table.id,
      name: table.name,
      tableType: table.tableType,
      rowCount: table.rowCount,
      browserLink: table.browserLink,
      parentTableId: table.parentTable?.id
    }));

    return {
      output: {
        tables,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${tables.length}** table(s)/view(s) in the doc.`
    };
  })
  .build();
