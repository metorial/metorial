import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new record in any ServiceNow table. Use this to create incidents, change requests, problems, users, or any other record type. Provide the table name and the field values for the new record.`,
  instructions: [
    'Field names must match the ServiceNow table column names (e.g. "short_description", "priority", "assignment_group").',
    'Reference fields accept sys_id values.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the ServiceNow table to create the record in'),
      fields: z
        .record(z.string(), z.any())
        .describe('Field name-value pairs for the new record'),
      displayValue: z
        .enum(['true', 'false', 'all'])
        .optional()
        .describe('Return display values, actual values, or both in the response')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The newly created record'),
      recordId: z.string().describe('The sys_id of the created record')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let record = await client.createRecord(ctx.input.tableName, ctx.input.fields, {
      displayValue: ctx.input.displayValue
    });

    let label = record?.number || record?.name || record?.short_description || record?.sys_id;

    return {
      output: {
        record,
        recordId: record.sys_id
      },
      message: `Created record **${label}** in \`${ctx.input.tableName}\`.`
    };
  })
  .build();
