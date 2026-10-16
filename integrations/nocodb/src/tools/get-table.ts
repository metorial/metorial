import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  optionalBoolean,
  optionalString,
  requireRecord,
  requireString,
  responseList
} from '../lib/schemas';
import { spec } from '../spec';

export let getTable = SlateTool.create(spec, {
  name: 'Get Table',
  key: 'get_table',
  description: `Retrieve detailed metadata for a specific table, including its full schema with all fields/columns, their types, and configuration. Useful for understanding table structure before creating or updating records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableId: z.string().describe('The table ID (prefixed with m)')
    })
  )
  .output(
    z.object({
      tableId: z.string().describe('Table ID'),
      title: z.string().describe('Table title'),
      columns: z
        .array(
          z.object({
            fieldId: z.string().describe('Column/field ID'),
            title: z.string().optional().describe('Column title when returned'),
            uidt: z
              .string()
              .optional()
              .describe('UI data type when returned (e.g. SingleLineText, Number, Email)'),
            required: z.boolean().optional().describe('Whether the field is required'),
            unique: z.boolean().optional().describe('Whether the field must be unique'),
            options: z
              .any()
              .optional()
              .describe('Field-specific options (e.g. select choices)')
          })
        )
        .describe('Array of column definitions'),
      meta: z.any().optional(),
      raw: z.any().optional().describe('Complete provider table metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let table = requireRecord(await client.getTable(ctx.input.tableId), 'table');
    let columns = responseList(table.columns, 'columns').map((c: any) => ({
      fieldId: requireString(c.id, 'column ID'),
      title: optionalString(c.title),
      uidt: optionalString(c.uidt),
      required: optionalBoolean(c.rqd),
      unique: optionalBoolean(c.unique),
      options: c.colOptions ?? c.dtxp ?? undefined
    }));

    return {
      output: {
        tableId: requireString(table.id, 'table ID'),
        title: requireString(table.title, 'table title'),
        columns,
        meta: table.meta,
        raw: table
      },
      message: `Table \`${table.title}\` has **${columns.length}** column(s).`
    };
  })
  .build();
