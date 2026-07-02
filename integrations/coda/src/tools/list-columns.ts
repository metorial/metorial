import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listColumnsTool = SlateTool.create(spec, {
  name: 'List Columns',
  key: 'list_columns',
  description: `List all columns in a table or view, including their names, IDs, types, and format information. Useful for discovering the schema of a table before reading or writing rows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      tableIdOrName: z.string().describe('ID or name of the table'),
      visibleOnly: z.boolean().optional().describe('Only return visible columns'),
      limit: z.number().optional().describe('Maximum number of columns to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      columns: z.array(
        z.object({
          columnId: z.string().describe('ID of the column'),
          name: z.string().describe('Name of the column'),
          columnType: z
            .string()
            .optional()
            .describe('Data type of the column (e.g. text, number, date)'),
          calculated: z
            .boolean()
            .optional()
            .describe('Whether the column is a formula/calculated column')
        })
      ),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listColumns(ctx.input.docId, ctx.input.tableIdOrName, {
      visibleOnly: ctx.input.visibleOnly,
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken
    });

    let columns = (result.items || []).map((col: any) => ({
      columnId: col.id,
      name: col.name,
      columnType: col.format?.type,
      calculated: col.calculated
    }));

    return {
      output: {
        columns,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${columns.length}** column(s) in table **${ctx.input.tableIdOrName}**.`
    };
  })
  .build();
