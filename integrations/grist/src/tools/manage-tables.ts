import { SlateTool } from 'slates';
import { z } from 'zod';
import { GristClient } from '../lib/client';
import { spec } from '../spec';

let tableSchema = z.object({
  tableId: z.string().describe('Table ID'),
  fields: z.record(z.string(), z.any()).optional().describe('Table metadata fields')
});

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List all tables in a Grist document. Returns table IDs and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID')
    })
  )
  .output(
    z.object({
      tables: z.array(tableSchema).describe('List of tables in the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let result = await client.listTables(ctx.input.documentId);
    let tables = (result.tables || []).map((t: any) => ({
      tableId: t.id,
      fields: t.fields
    }));

    return {
      output: { tables },
      message: `Found **${tables.length}** table(s) in document **${ctx.input.documentId}**.`
    };
  })
  .build();

export let createTable = SlateTool.create(spec, {
  name: 'Create Table',
  key: 'create_table',
  description: `Create one or more tables in a Grist document. Each table can be initialized with columns.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      tables: z
        .array(
          z.object({
            tableId: z
              .string()
              .optional()
              .describe('Table ID (auto-generated if not provided)'),
            columns: z
              .array(
                z.object({
                  columnId: z.string().optional().describe('Column ID'),
                  fields: z
                    .object({
                      label: z.string().optional().describe('Column label'),
                      type: z
                        .string()
                        .optional()
                        .describe(
                          'Column type (e.g., Text, Int, Numeric, Date, DateTime, Bool, Choice, Ref, RefList, Attachments)'
                        ),
                      widgetOptions: z
                        .string()
                        .optional()
                        .describe('JSON-encoded widget options'),
                      formula: z.string().optional().describe('Column formula'),
                      isFormula: z
                        .boolean()
                        .optional()
                        .describe('Whether the column is a formula column')
                    })
                    .optional()
                    .describe('Column configuration')
                })
              )
              .describe('Columns to create in the table')
          })
        )
        .describe('Tables to create')
    })
  )
  .output(
    z.object({
      tables: z
        .array(
          z.object({
            tableId: z.string().describe('Created table ID')
          })
        )
        .describe('Created tables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let tablesToCreate = ctx.input.tables.map(t => ({
      id: t.tableId,
      columns: t.columns.map(c => ({
        id: c.columnId,
        fields: c.fields
      }))
    }));

    let result = await client.createTables(ctx.input.documentId, tablesToCreate);
    let tables = (result.tables || []).map((t: any) => ({
      tableId: t.id
    }));

    return {
      output: { tables },
      message: `Created **${tables.length}** table(s) in document **${ctx.input.documentId}**.`
    };
  })
  .build();
