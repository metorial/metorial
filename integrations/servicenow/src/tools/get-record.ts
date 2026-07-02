import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record from any ServiceNow table by its sys_id. Returns the full record or specific fields. Use this to get detailed information about an incident, change request, user, or any other record.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z
        .string()
        .describe(
          'Name of the ServiceNow table (e.g. "incident", "change_request", "sys_user")'
        ),
      recordId: z.string().describe('The sys_id of the record to retrieve'),
      fields: z
        .array(z.string())
        .optional()
        .describe('List of field names to return. If omitted, all fields are returned.'),
      displayValue: z
        .enum(['true', 'false', 'all'])
        .optional()
        .describe('Return display values, actual values, or both')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The retrieved record')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let record = await client.getRecord(ctx.input.tableName, ctx.input.recordId, {
      fields: ctx.input.fields,
      displayValue: ctx.input.displayValue
    });

    let label =
      record?.number || record?.name || record?.short_description || ctx.input.recordId;

    return {
      output: { record },
      message: `Retrieved record **${label}** from \`${ctx.input.tableName}\`.`
    };
  })
  .build();
