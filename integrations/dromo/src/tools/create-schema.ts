import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

let fieldInputSchema = z.object({
  key: z.string().describe('Unique key for the field (used in the output data)'),
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
    .describe('Alternate column names that should auto-match to this field'),
  validators: z.array(z.any()).optional().describe('Validation rules for this field')
});

export let createSchema = SlateTool.create(spec, {
  name: 'Create Schema',
  key: 'create_schema',
  description: `Creates a new import schema defining the expected fields and their properties. Schemas are used to configure how data is matched, validated, and transformed during imports.`,
  instructions: [
    'Each field must have a unique key and a label.',
    'Supported field types include: string, number, email, phone, url, currency, percentage, select, checkbox, date.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name for the schema'),
      fields: z.array(fieldInputSchema).describe('Field definitions for the schema'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional schema-level settings')
    })
  )
  .output(
    z.object({
      schemaId: z.string().describe('Unique identifier of the created schema'),
      name: z.string().describe('Name of the schema'),
      fieldCount: z.number().describe('Number of fields in the schema')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });

    let schema = await client.createSchema({
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
      message: `Created schema **${schema.name}** with ${(schema.fields ?? []).length} field(s).`
    };
  })
  .build();
