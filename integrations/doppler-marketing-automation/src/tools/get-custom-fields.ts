import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCustomFields = SlateTool.create(spec, {
  name: 'Get Custom Fields',
  key: 'get_custom_fields',
  description: `Retrieve all custom field definitions for the account. Returns field names, types, and metadata.
Useful for understanding which fields are available before adding or importing subscribers.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            type: z
              .string()
              .describe('Field type (boolean, string, number, date, gender, country)'),
            predefined: z.boolean().describe('Whether the field is a predefined system field'),
            isPrivate: z.boolean().describe('Whether the field is private'),
            isReadonly: z.boolean().describe('Whether the field is read-only'),
            sample: z.string().describe('Sample value for the field')
          })
        )
        .describe('Array of custom field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    let result = await client.getFields();
    let fields = (result.items ?? []).map(f => ({
      name: f.name,
      type: f.type,
      predefined: f.predefined,
      isPrivate: f.private,
      isReadonly: f.readonly,
      sample: f.sample
    }));

    return {
      output: { fields },
      message: `Found **${fields.length}** custom fields.`
    };
  })
  .build();
