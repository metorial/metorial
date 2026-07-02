import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

let schemaFieldSchema = z.object({
  key: z.string().describe('Unique key for the field'),
  label: z.string().describe('Display label for the field'),
  type: z.string().optional().describe('Field type (e.g., string, number, email, phone)'),
  description: z.string().optional().describe('Description of the field'),
  required: z.boolean().optional().describe('Whether the field is required')
});

export let listSchemas = SlateTool.create(spec, {
  name: 'List Schemas',
  key: 'list_schemas',
  description: `Lists all import schemas configured in your Dromo account. Schemas define the fields expected during data imports, including field types, labels, and validation rules.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      schemas: z.array(
        z.object({
          schemaId: z.string().describe('Unique identifier of the schema'),
          name: z.string().describe('Name of the schema'),
          fields: z.array(schemaFieldSchema).describe('Fields defined in the schema'),
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });
    let schemas = await client.listSchemas();

    let mapped = schemas.map(s => ({
      schemaId: s.id,
      name: s.name,
      fields: (s.fields ?? []).map(f => ({
        key: f.key,
        label: f.label,
        type: f.type,
        description: f.description,
        required: f.required
      })),
      createdDate: s.created_date,
      updatedDate: s.updated_date
    }));

    return {
      output: { schemas: mapped },
      message: `Found **${mapped.length}** schema(s).`
    };
  })
  .build();
