import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

let schemaFieldSchema = z.object({
  key: z.string().describe('Unique key for the field'),
  label: z.string().describe('Display label for the field'),
  type: z.string().optional().describe('Field type (e.g., string, number, email, phone)'),
  description: z.string().optional().describe('Description of the field'),
  required: z.boolean().optional().describe('Whether the field is required'),
  alternateMatches: z
    .array(z.string())
    .optional()
    .describe('Alternate column names that match this field'),
  validators: z.array(z.any()).optional().describe('Validation rules for this field')
});

export let getSchema = SlateTool.create(spec, {
  name: 'Get Schema',
  key: 'get_schema',
  description: `Retrieves full details of a specific import schema by ID, including all field definitions, validation rules, alternate matches, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      schemaId: z.string().describe('ID of the schema to retrieve')
    })
  )
  .output(
    z.object({
      schemaId: z.string().describe('Unique identifier of the schema'),
      name: z.string().describe('Name of the schema'),
      fields: z.array(schemaFieldSchema).describe('Fields defined in the schema'),
      settings: z.record(z.string(), z.any()).optional().describe('Schema-level settings'),
      hooks: z.record(z.string(), z.any()).optional().describe('Serializable schema hooks'),
      createdDate: z
        .string()
        .optional()
        .describe('ISO-8601 timestamp of when the schema was created'),
      updatedDate: z
        .string()
        .optional()
        .describe('ISO-8601 timestamp of when the schema was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });
    let schema = await client.getSchema(ctx.input.schemaId);

    return {
      output: {
        schemaId: schema.id,
        name: schema.name,
        fields: (schema.fields ?? []).map(f => ({
          key: f.key,
          label: f.label,
          type:
            typeof f.type === 'string'
              ? f.type
              : f.type === undefined
                ? undefined
                : JSON.stringify(f.type),
          description: f.description,
          required:
            f.required ??
            f.validators?.some(v => v && typeof v === 'object' && v.validate === 'required'),
          alternateMatches: f.alternateMatches,
          validators: f.validators
        })),
        settings: schema.settings,
        hooks: schema.hooks,
        createdDate: schema.created_date,
        updatedDate: schema.updated_date
      },
      message: `Retrieved schema **${schema.name}** with ${(schema.fields ?? []).length} field(s).`
    };
  })
  .build();
