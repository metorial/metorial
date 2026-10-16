import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireRecord } from '../lib/schemas';
import { spec } from '../spec';

export let createRecords = SlateTool.create(spec, {
  name: 'Create Records',
  key: 'create_records',
  description: `Create one or more records in a NocoDB table. Each record is an object where keys are field names and values are the data to insert.
Supports bulk insertion by passing multiple records at once.`,
  instructions: [
    'Each record object should use field titles as keys.',
    'Use link_records to change Links or LinkToAnotherRecord fields; record creation does not write these relationships.'
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
        .describe('Array of created record objects with their IDs'),
      raw: z.any().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.createRecords(ctx.input.tableId, ctx.input.records);
    let createdRecords = (Array.isArray(result) ? result : [result]).map(record =>
      requireRecord(record, 'record')
    );

    return {
      output: { createdRecords, raw: result },
      message: `Created **${createdRecords.length}** record(s) in table \`${ctx.input.tableId}\`.`
    };
  })
  .build();
