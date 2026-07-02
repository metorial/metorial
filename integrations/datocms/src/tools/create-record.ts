import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new content record for a given model. Provide field values matching the model's schema. Localized fields should use an object with locale keys (e.g. \`{"en": "Hello", "it": "Ciao"}\`).`,
  instructions: [
    'The modelId must be the ID or API key of an existing model.',
    'Omitted fields will use their configured default or null.',
    'For localized fields, provide an object with locale codes as keys.'
  ]
})
  .input(
    z.object({
      modelId: z.string().describe('ID or API key of the model to create a record for'),
      fields: z
        .record(z.string(), z.any())
        .describe('Field values as key-value pairs matching the model schema'),
      publish: z
        .boolean()
        .optional()
        .describe('If true, publish the record immediately after creation')
    })
  )
  .output(
    z.object({
      record: z.any().describe('The created record object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let record = await client.createRecord(ctx.input.modelId, ctx.input.fields);

    if (ctx.input.publish) {
      record = await client.publishRecord(record.id);
    }

    let title = record.title || record.name || record.id;
    return {
      output: { record },
      message: `Created record **${title}** (ID: ${record.id})${ctx.input.publish ? ' and published it' : ''}.`
    };
  })
  .build();
