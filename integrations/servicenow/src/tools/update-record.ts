import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing record in any ServiceNow table. Use this to modify incidents, change requests, problems, users, or any other record. Supports partial updates — only fields provided will be changed.`,
  instructions: [
    'Only include the fields you want to change. Omitted fields remain unchanged.',
    'To add a work note, set "work_notes". To add a comment, set "comments".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the ServiceNow table'),
      recordId: z.string().describe('The sys_id of the record to update'),
      fields: z.record(z.string(), z.any()).describe('Field name-value pairs to update'),
      displayValue: z
        .enum(['true', 'false', 'all'])
        .optional()
        .describe('Return display values, actual values, or both in the response')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The updated record')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let record = await client.updateRecord(
      ctx.input.tableName,
      ctx.input.recordId,
      ctx.input.fields,
      {
        displayValue: ctx.input.displayValue
      }
    );

    let label =
      record?.number || record?.name || record?.short_description || ctx.input.recordId;

    return {
      output: { record },
      message: `Updated record **${label}** in \`${ctx.input.tableName}\`.`
    };
  })
  .build();
