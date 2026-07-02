import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `Lists all custom field definitions in the workspace. Custom fields allow organizing stories by Priority, Severity, Technical Area, and more. Returns field IDs and their possible values, which are needed when setting custom fields on stories.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      customFields: z
        .array(
          z.object({
            fieldId: z.string().describe('Custom field ID'),
            name: z.string().describe('Field name'),
            fieldType: z.string().describe('Field type (e.g., enum)'),
            description: z.string().describe('Field description'),
            enabled: z.boolean().describe('Whether the field is enabled'),
            values: z
              .array(
                z.object({
                  valueId: z.string().describe('Value ID'),
                  value: z.string().describe('Display value'),
                  position: z.number().describe('Position in the list'),
                  enabled: z.boolean().describe('Whether this value is enabled')
                })
              )
              .describe('Possible values for this custom field')
          })
        )
        .describe('List of all custom field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let fields = await client.listCustomFields();

    let mapped = fields.map((f: any) => ({
      fieldId: f.id,
      name: f.name,
      fieldType: f.field_type || 'enum',
      description: f.description || '',
      enabled: f.enabled ?? true,
      values: (f.values || []).map((v: any) => ({
        valueId: v.id,
        value: v.value,
        position: v.position ?? 0,
        enabled: v.enabled ?? true
      }))
    }));

    return {
      output: { customFields: mapped },
      message: `Found **${mapped.length}** custom fields`
    };
  })
  .build();
