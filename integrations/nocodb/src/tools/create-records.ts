import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRecords = SlateTool.create(spec, {
  name: 'Create Records',
  key: 'create_records',
  description: `Create one or more records in a NocoDB table. Each record is an object where keys are field names and values are the data to insert.
Supports bulk insertion by passing multiple records at once.`,
  instructions: [
    'Each record object should use field titles as keys.',
    'For linked fields, pass the linked record IDs.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableId: z.string().describe('The table ID (prefixed with m)'),
      records: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .describe(
          'Array of record objects to create, each being a field-name-to-value mapping'
        )
    })
  )
  .output(
    z.object({
      createdRecords: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of created record objects with their IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.createRecords(ctx.input.tableId, ctx.input.records);
    let createdRecords = Array.isArray(result) ? result : [result];

    return {
      output: { createdRecords },
      message: `Created **${createdRecords.length}** record(s) in table \`${ctx.input.tableId}\`.`
    };
  })
  .build();
