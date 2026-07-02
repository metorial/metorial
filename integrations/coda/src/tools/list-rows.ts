import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRowsTool = SlateTool.create(spec, {
  name: 'List Rows',
  key: 'list_rows',
  description: `List rows from a table or view in a Coda doc. Supports filtering by column value, sorting, pagination, and incremental sync via sync tokens. Returns row IDs, names, and cell values.`,
  instructions: [
    'Use the **query** parameter to filter rows by column value, formatted as "columnName:value".',
    'Use **syncToken** from a previous response to fetch only rows changed since the last request.',
    'Set **useColumnNames** to true to get cell values keyed by column name instead of column ID.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      tableIdOrName: z.string().describe('ID or name of the table'),
      query: z
        .string()
        .optional()
        .describe('Filter rows by column value (format: "columnName:value")'),
      sortBy: z.string().optional().describe('Sort order (e.g. "natural" or "createdAt")'),
      useColumnNames: z
        .boolean()
        .optional()
        .describe('Use column names as keys instead of IDs'),
      valueFormat: z
        .enum(['simple', 'simpleWithArrays', 'rich'])
        .optional()
        .describe('Format for cell values'),
      syncToken: z
        .string()
        .optional()
        .describe('Token from a previous request to fetch only changed rows'),
      visibleOnly: z.boolean().optional().describe('Only return visible rows and columns'),
      limit: z.number().optional().describe('Maximum number of rows to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      rows: z.array(
        z.object({
          rowId: z.string().describe('ID of the row'),
          name: z.string().optional().describe('Display name of the row'),
          createdAt: z.string().optional().describe('When the row was created'),
          updatedAt: z.string().optional().describe('When the row was last updated'),
          cells: z
            .record(z.string(), z.any())
            .describe('Cell values keyed by column ID or name'),
          browserLink: z.string().optional().describe('URL to open the row')
        })
      ),
      nextPageToken: z.string().optional().describe('Token for fetching the next page'),
      nextSyncToken: z
        .string()
        .optional()
        .describe('Token for incremental sync in subsequent requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listRows(ctx.input.docId, ctx.input.tableIdOrName, {
      query: ctx.input.query,
      sortBy: ctx.input.sortBy,
      useColumnNames: ctx.input.useColumnNames,
      valueFormat: ctx.input.valueFormat,
      syncToken: ctx.input.syncToken,
      visibleOnly: ctx.input.visibleOnly,
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken
    });

    let rows = (result.items || []).map((row: any) => ({
      rowId: row.id,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      cells: row.values || {},
      browserLink: row.browserLink
    }));

    return {
      output: {
        rows,
        nextPageToken: result.nextPageToken,
        nextSyncToken: result.nextSyncToken
      },
      message: `Found **${rows.length}** row(s) in table **${ctx.input.tableIdOrName}**.${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
