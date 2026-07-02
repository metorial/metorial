import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
            title: z.string().describe('Column title'),
            uidt: z.string().describe('UI data type (e.g. SingleLineText, Number, Email)'),
            required: z.boolean().optional().describe('Whether the field is required'),
            unique: z.boolean().optional().describe('Whether the field must be unique'),
            options: z
              .any()
              .optional()
              .describe('Field-specific options (e.g. select choices)')
          })
        )
        .describe('Array of column definitions'),
      meta: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let table = await client.getTable(ctx.input.tableId);
    let columns = (table?.columns ?? []).map((c: any) => ({
      fieldId: c.id,
      title: c.title ?? '',
      uidt: c.uidt ?? c.dt ?? 'Unknown',
      required: c.rqd ? true : undefined,
      unique: c.unique ? true : undefined,
      options: c.colOptions ?? c.dtxp ?? undefined
    }));

    return {
      output: {
        tableId: table.id,
        title: table.title ?? '',
        columns,
        meta: table.meta
      },
      message: `Table \`${table.title}\` has **${columns.length}** column(s).`
    };
  })
  .build();
