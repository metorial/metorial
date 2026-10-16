import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDataTables = SlateTool.create(spec, {
  name: 'List Data Tables',
  key: 'list_data_tables',
  description:
    'Discover data table IDs, keys, names, field definitions, and access rules. Use a returned key or ID with get_data_table, query_data_records, or manage_data_record.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      tables: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Complete table definitions including IDs, keys, fields, and access rules'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).listDataTables();
    return { output, message: `Found **${output.tables.length}** data tables.` };
  })
  .build();
