import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let exportCsv = SlateTool.create(spec, {
  name: 'Export Table CSV',
  key: 'export_csv',
  description: `Export all data from a database table as CSV format. Returns the CSV content as a string.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the database connection'),
      tableName: z.string().describe('Name of the table to export'),
      masterPassword: z
        .string()
        .optional()
        .describe('Master password if the connection uses client-side encryption')
    })
  )
  .output(
    z.object({
      csvContent: z.string().describe('CSV formatted table data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      masterPassword: ctx.input.masterPassword
    });

    let csvContent = await client.exportCsv(ctx.input.connectionId, ctx.input.tableName);

    return {
      output: { csvContent },
      message: `Exported table **${ctx.input.tableName}** as CSV.`
    };
  })
  .build();
