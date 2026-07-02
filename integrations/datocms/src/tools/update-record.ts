import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing content record's field values. Only provide the fields you want to change; omitted fields remain untouched. For localized fields, you must provide all locale values (not just the changed ones).`,
  instructions: [
    'Set a field to null or [] to clear it.',
    'For localized fields, always provide the complete locale object with all languages.'
  ]
})
  .input(
    z.object({
      recordId: z.string().describe('ID of the record to update'),
      fields: z
        .record(z.string(), z.any())
        .describe('Field values to update as key-value pairs'),
      publish: z.boolean().optional().describe('If true, publish the record after updating')
    })
  )
  .output(
    z.object({
      record: z.any().describe('The updated record object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let record = await client.updateRecord(ctx.input.recordId, ctx.input.fields);

    if (ctx.input.publish) {
      record = await client.publishRecord(record.id);
    }

    let title = record.title || record.name || record.id;
    return {
      output: { record },
      message: `Updated record **${title}** (ID: ${record.id})${ctx.input.publish ? ' and published it' : ''}.`
    };
  })
  .build();
