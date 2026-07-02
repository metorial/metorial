import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getColumnTool = SlateTool.create(spec, {
  name: 'Get Column',
  key: 'get_column',
  description: `Retrieve metadata for a column in a Coda table or view, including display name, format type, calculation status, and parent table.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      tableIdOrName: z.string().describe('ID or name of the table or view'),
      columnIdOrName: z.string().describe('ID or name of the column to retrieve')
    })
  )
  .output(
    z.object({
      columnId: z.string().describe('ID of the column'),
      name: z.string().describe('Name of the column'),
      columnType: z.string().optional().describe('Coda column format type'),
      calculated: z.boolean().optional().describe('Whether the column is calculated'),
      parentTableId: z.string().optional().describe('ID of the parent table')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let column = await client.getColumn(
      ctx.input.docId,
      ctx.input.tableIdOrName,
      ctx.input.columnIdOrName
    );

    return {
      output: {
        columnId: column.id,
        name: column.name,
        columnType: column.format?.type,
        calculated: column.calculated,
        parentTableId: column.parent?.id
      },
      message: `Retrieved column **${column.name}** (${column.id}).`
    };
  })
  .build();
