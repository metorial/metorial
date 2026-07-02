import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

let fieldInputSchema = z.object({
  key: z.string().describe('Unique key for the field'),
  label: z.string().describe('Display label shown to users during import'),
  type: z
    .string()
    .optional()
    .describe('Field type: string, number, email, phone, url, currency, percentage, etc.'),
  description: z.string().optional().describe('Help text for the field'),
  required: z.boolean().optional().describe('Whether the field is required'),
  alternateMatches: z
    .array(z.string())
    .optional()
    .describe('Alternate column names that match this field'),
  validators: z.array(z.any()).optional().describe('Validation rules for this field')
});

export let updateSchema = SlateTool.create(spec, {
  name: 'Update Schema',
  key: 'update_schema',
  description: `Updates an existing import schema. Replaces the schema's name, fields, and settings with the provided values.`,
  instructions: [
    'This is a full replacement — provide the complete set of fields, not just changes.'
  ]
})
  .input(
    z.object({
      schemaId: z.string().describe('ID of the schema to update'),
      name: z.string().describe('Updated name for the schema'),
      fields: z.array(fieldInputSchema).describe('Complete set of field definitions'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional schema-level settings')
    })
  )
  .output(
    z.object({
      schemaId: z.string().describe('Unique identifier of the updated schema'),
      name: z.string().describe('Updated name of the schema'),
      fieldCount: z.number().describe('Number of fields in the schema')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });

    let schema = await client.updateSchema(ctx.input.schemaId, {
      name: ctx.input.name,
      fields: ctx.input.fields.map(f => ({
        key: f.key,
        label: f.label,
        type: f.type,
        description: f.description,
        required: f.required,
        alternateMatches: f.alternateMatches,
        validators: f.validators
      })),
      settings: ctx.input.settings
    });

    return {
      output: {
        schemaId: schema.id,
        name: schema.name,
        fieldCount: (schema.fields ?? []).length
      },
      message: `Updated schema **${schema.name}** with ${(schema.fields ?? []).length} field(s).`
    };
  })
  .build();
