import { SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { spec } from '../spec';

export let getTableMetadata = SlateTool.create(spec, {
  name: 'Get Table Metadata',
  key: 'get_table_metadata',
  description: `Retrieve metadata for a Nasdaq Data Link table, including column definitions, available filters, update frequency, and subscription status.
Use this to understand a table's structure before querying it.`,
  instructions: [
    'Use the tablePath in the format PUBLISHER/TABLE_CODE (e.g., ZACKS/FC, SHARADAR/SF1).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tablePath: z
        .string()
        .describe('Table path in the format PUBLISHER/TABLE_CODE (e.g., ZACKS/FC).')
    })
  )
  .output(
    z.object({
      vendorCode: z.string().describe('Vendor/publisher code.'),
      tableCode: z.string().describe('Table code.'),
      name: z.string().describe('Table name.'),
      description: z.string().describe('Table description.'),
      columns: z
        .array(
          z.object({
            name: z.string(),
            type: z.string()
          })
        )
        .describe('Column definitions.'),
      filters: z.array(z.string()).describe('Columns that can be used as filters.'),
      primaryKey: z.array(z.string()).describe('Primary key columns.'),
      premium: z.boolean().describe('Whether a subscription is required.'),
      refreshedAt: z.string().describe('Last refresh timestamp.'),
      status: z.string().describe('Current data status.'),
      updateFrequency: z.string().describe('How often the data is updated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TablesClient({ apiKey: ctx.auth.token });

    let response = await client.getTableMetadata(ctx.input.tablePath);

    let table = response.datatable;

    return {
      output: {
        vendorCode: table.vendor_code,
        tableCode: table.datatable_code,
        name: table.name,
        description: table.description || '',
        columns: table.columns,
        filters: table.filters || [],
        primaryKey: table.primary_key || [],
        premium: table.premium,
        refreshedAt: table.status?.refreshed_at || '',
        status: table.status?.status || '',
        updateFrequency: table.status?.update_frequency || ''
      },
      message: `Table **${ctx.input.tablePath}**: "${table.name}" with **${table.columns.length}** columns. ${table.premium ? '⚠️ Premium subscription required.' : 'Free access.'}`
    };
  })
  .build();
