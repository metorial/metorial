import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { tableKeySchema } from '../lib/types';
import { spec } from '../spec';

export let getDataTable = SlateTool.create(spec, {
  name: 'Get Data Table',
  key: 'get_data_table',
  description:
    'Inspect a data table by a key or ID discovered with list_data_tables. Returns field keys, types, required/default values, relationship targets, and access rules before querying or modifying records.',
  tags: { readOnly: true }
})
  .input(z.object({ tableKey: tableKeySchema }))
  .output(
    z.object({
      table: z.record(z.string(), z.unknown()).describe('Complete provider table definition'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).getDataTable(ctx.input.tableKey);
    return { output, message: 'Retrieved the data table definition.' };
  })
  .build();
