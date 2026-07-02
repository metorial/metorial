import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let replaceRecord = SlateTool.create(spec, {
  name: 'Replace Record',
  key: 'replace_record',
  description: `Fully replace all fields of an existing record in a Bubble data type. Unlike update which only modifies specified fields, replace overwrites the entire record. Fields not included in the request will be cleared.`,
  instructions: [
    'This performs a full replacement (PUT), not a partial update. All fields must be provided or they will be cleared.',
    'Use "Update Record" if you only want to change specific fields.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      dataType: z
        .string()
        .describe('Name of the Bubble data type (table) containing the record.'),
      recordId: z.string().describe('Unique ID of the record to replace.'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Complete set of field values for the record. Fields not included will be cleared.'
        )
    })
  )
  .output(
    z.object({
      replaced: z.boolean().describe('Whether the replacement was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.appBaseUrl,
      token: ctx.auth?.token
    });

    await client.replaceRecord(ctx.input.dataType, ctx.input.recordId, ctx.input.fields);

    return {
      output: {
        replaced: true
      },
      message: `Replaced **${ctx.input.dataType}** record \`${ctx.input.recordId}\` with ${Object.keys(ctx.input.fields).length} field(s).`
    };
  })
  .build();
