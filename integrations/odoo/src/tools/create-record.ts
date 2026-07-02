import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new record in any Odoo model. Provide the model name and a dictionary of field values. Returns the ID of the newly created record.

Use **List Model Fields** to discover available fields and their types before creating records.`,
  instructions: [
    'Many-to-one fields accept a numeric ID (e.g., "partner_id": 42).',
    'Many-to-many fields accept special command tuples (e.g., "tag_ids": [[6, 0, [1, 2, 3]]] to set tags).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('The Odoo model to create a record in (e.g., "res.partner", "crm.lead")'),
      values: z
        .record(z.string(), z.unknown())
        .describe(
          'Field values for the new record (e.g., {"name": "John", "email": "john@example.com"})'
        )
    })
  )
  .output(
    z.object({
      recordId: z.number().describe('The ID of the newly created record')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let recordId = await client.create(ctx.input.model, ctx.input.values);

    return {
      output: { recordId },
      message: `Created record **#${recordId}** in \`${ctx.input.model}\`.`
    };
  })
  .build();
