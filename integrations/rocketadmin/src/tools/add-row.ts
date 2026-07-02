import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let addRow = SlateTool.create(spec, {
  name: 'Add Row',
  key: 'add_row',
  description: `Insert a new row into a database table. Provide column values as key-value pairs matching the table's schema.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the database connection'),
      tableName: z.string().describe('Name of the table to insert into'),
      rowData: z
        .record(z.string(), z.unknown())
        .describe(
          'Column values for the new row (e.g., {"name": "John", "email": "john@example.com"})'
        ),
      masterPassword: z
        .string()
        .optional()
        .describe('Master password if the connection uses client-side encryption')
    })
  )
  .output(
    z.object({
      row: z.record(z.string(), z.unknown()).describe('The created row with all column values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      masterPassword: ctx.input.masterPassword
    });

    let row = await client.addRow(
      ctx.input.connectionId,
      ctx.input.tableName,
      ctx.input.rowData
    );

    return {
      output: { row },
      message: `Row added to **${ctx.input.tableName}** successfully.`
    };
  })
  .build();
