import { SlateTool } from 'slates';
import { z } from 'zod';
import { createRocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let exportCsv = SlateTool.create(spec, {
  name: 'Export Table CSV',
  key: 'export_csv',
  description: `Export all data from a database table as CSV format. Provides a downloadable CSV file.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z
        .string()
        .describe(
          'Connection ID. Call list_connections to discover authorized connection IDs.'
        ),
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
    let client = createRocketadminClient(ctx.auth, ctx.config, ctx.input.masterPassword);

    let csvContent = await client.exportCsv(ctx.input.connectionId, ctx.input.tableName);

    await ctx.addAttachment({
      type: 'content',
      content: new Response(csvContent, {
        headers: { 'content-type': 'text/csv; charset=utf-8' }
      }),
      filename: `${ctx.input.tableName.replace(/[^a-zA-Z0-9_.-]/g, '_') || 'table'}.csv`,
      mimeType: 'text/csv'
    });

    return {
      output: { csvContent },
      message: `Exported table **${ctx.input.tableName}** as CSV.`
    };
  })
  .build();
