import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tableSchema = z.object({
  tableId: z.string().describe('Unique identifier of the table'),
  name: z.string().describe('Name of the table'),
  primaryDisplay: z.string().optional().describe('Column used as the primary display value'),
  schema: z
    .record(z.string(), z.any())
    .optional()
    .describe('Table column definitions keyed by column name')
});

export let searchTables = SlateTool.create(spec, {
  name: 'Search Tables',
  key: 'search_tables',
  description: `Search for tables within a Budibase application. Returns table names, IDs, and their column schemas. Requires the application ID to scope the search.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z
        .string()
        .describe(
          'Application ID to search tables in (must include x-budibase-app-id context)'
        ),
      name: z.string().optional().describe('Filter tables by name')
    })
  )
  .output(
    z.object({
      tables: z.array(tableSchema).describe('List of matching tables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      appId: ctx.input.appId
    });
    let results = await client.searchTables({ name: ctx.input.name });

    let tables = results.map((table: any) => ({
      tableId: table._id,
      name: table.name,
      primaryDisplay: table.primaryDisplay,
      schema: table.schema
    }));

    return {
      output: { tables },
      message: `Found **${tables.length}** table(s)${ctx.input.name ? ` matching "${ctx.input.name}"` : ''} in application ${ctx.input.appId}.`
    };
  })
  .build();
